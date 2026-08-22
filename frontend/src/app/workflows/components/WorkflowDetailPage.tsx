'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import AddJobToWorkflowModal from './AddJobToWorkflowModal';
import {
  ChevronRightIcon,
  PlayIcon,
  ArrowPathIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  XMarkIcon,
  Square2StackIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import WorkflowCanvas from './WorkflowCanvas';

type WorkflowStatus = 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
type ScheduleType = 'ONCE' | 'INTERVAL' | 'CRON';

interface Workflow {
  id: string;
  name: string;
  description: string | null;
  status: WorkflowStatus;
  startAt: string | null;
  endAt: string | null;
  scheduleType: ScheduleType;
  scheduleExpression: string;
  timezone: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

interface WorkflowJob {
  id: string;
  workflowId: string;
  jobId: string;
  job: {
    id: string;
    type: string;
    status: 'WAITING' | 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'DEAD';
    priority: number;
  };
  createdAt: string;
}

interface WorkflowDependency {
  id: string;
  parentWorkflowJobId: string;
  parentJobId: string;
  childWorkflowJobId: string;
  childJobId: string;
  createdAt: string;
}

interface Props {
  workflowId: string;
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    WAITING: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    PENDING: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    RUNNING: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    COMPLETED: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
    FAILED: 'bg-red-500/10 text-red-400 border-red-500/20',
    DEAD: 'bg-red-500/10 text-red-400 border-red-500/20',
  };
  return colors[status] || 'bg-zinc-800 text-zinc-400 border-zinc-700';
}

function getStatusDot(status: string): string {
  const colors: Record<string, string> = {
    WAITING: 'bg-amber-400',
    PENDING: 'bg-blue-400',
    RUNNING: 'bg-emerald-400',
    COMPLETED: 'bg-zinc-400',
    FAILED: 'bg-red-400',
    DEAD: 'bg-red-400',
  };
  return colors[status] || 'bg-zinc-500';
}

export default function WorkflowDetailPage({ workflowId }: Props) {
  const router = useRouter();
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [jobs, setJobs] = useState<WorkflowJob[]>([]);
  const [dependencies, setDependencies] = useState<WorkflowDependency[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddJobModal, setShowAddJobModal] = useState(false);

  // Fetch workflow details
  const fetchWorkflow = async () => {
    try {
      const response = await fetch(`http://localhost:3000/workflow/${workflowId}`);
      if (!response.ok) throw new Error('Failed to fetch workflow');
      const data = await response.json();
      setWorkflow(data.workflow || data);
    } catch (err) {
      console.error('Error fetching workflow:', err);
      toast.error('Failed to load workflow');
    }
  };

  // Fetch jobs in workflow
  const fetchWorkflowJobs = async () => {
    try {
      const response = await fetch(`http://localhost:3000/workflow/${workflowId}/jobs`);
      if (!response.ok) throw new Error('Failed to fetch workflow jobs');
      const data = await response.json();

      console.log('📦 Raw workflow jobs response:', data);

      // The API returns an array of job objects
      // Each object should have: { id: "workflow-job-id", jobId: "original-job-id" }
      // If the API returns just the job IDs without workflow IDs, we need to handle that
      const jobList = Array.isArray(data) ? data : data.jobs || [];

      if (jobList.length === 0) {
        setJobs([]);
        return;
      }

      // Log the first item to see the structure
      if (jobList.length > 0) {
        console.log('First job item structure:', jobList[0]);
        console.log('Keys in first item:', Object.keys(jobList[0]));
      }

      const jobDetailsPromises = jobList.map(async (item: any, index: number) => {
        // Try to get the job ID from various possible field names
        const jobId = item.jobId || item.job_id || item.id || item.job;
        
        // Get the workflow job ID - this is the ID that matches parentWorkflowJobId/childWorkflowJobId
        // If the API returns an 'id' field, use it. Otherwise, generate one.
        let workflowJobId = item.id || item.workflowJobId || item.workflow_job_id;
        
        // If no workflow job ID is provided, generate one using the job ID and index
        if (!workflowJobId) {
          workflowJobId = `workflow-job-${jobId || index}`;
          console.warn(`⚠️ No workflow job ID found, using generated ID: ${workflowJobId}`);
        }

        if (!jobId) {
          console.warn(`⚠️ No job ID found for item:`, item);
          return null;
        }

        try {
          const response = await fetch(`http://localhost:3000/jobs/${jobId}`);
          if (!response.ok) {
            console.warn(`⚠️ Failed to fetch job details for ${jobId}`);
            return null;
          }
          const jobData = await response.json();
          const rawJob = jobData.job || jobData;

          let priorityString = rawJob.priority || 0;
          if (typeof priorityString === 'string') {
            priorityString = parseInt(priorityString, 10) || 0;
          }

          return {
            id: workflowJobId,
            workflowId: workflowId,
            jobId: jobId,
            job: {
              id: jobId,
              type: rawJob.type || 'unknown',
              status: rawJob.status || 'WAITING',
              priority: priorityString,
            },
            createdAt: new Date().toISOString(),
          };
        } catch (err) {
          console.error(`❌ Error fetching job ${jobId}:`, err);
          return null;
        }
      });

      const jobDetails = await Promise.all(jobDetailsPromises);
      const validJobs = jobDetails.filter((job): job is NonNullable<typeof job> => job !== null);
      
      console.log('✅ Jobs with IDs:', validJobs);
      setJobs(validJobs);
    } catch (err) {
      console.error('❌ Error fetching workflow jobs:', err);
      toast.error('Failed to load workflow jobs');
    }
  };

  // Fetch dependencies
  const fetchDependencies = async () => {
    try {
      const response = await fetch(`http://localhost:3000/workflow/${workflowId}/dependencies`);
      if (!response.ok) throw new Error('Failed to fetch dependencies');
      const data = await response.json();

      setDependencies(data.dependencies || []);
      console.log('📦 Dependencies:', data.dependencies || []);
    } catch (err) {
      console.error('Error fetching dependencies:', err);
      toast.error('Failed to load dependencies');
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchWorkflow(), fetchWorkflowJobs(), fetchDependencies()]);
      setLoading(false);
    };
    loadData();
  }, [workflowId]);

  // Debug: Check if job IDs match dependency IDs
  useEffect(() => {
    if (jobs.length > 0 && dependencies.length > 0) {
      const jobIds = new Set(jobs.map((j) => j.id));
      const depIds = new Set([
        ...dependencies.map((d) => d.parentWorkflowJobId),
        ...dependencies.map((d) => d.childWorkflowJobId),
      ]);
      const missing = [...depIds].filter((id) => !jobIds.has(id));
      if (missing.length > 0) {
        console.warn('⚠️ Missing jobs for dependencies:', missing);
        console.warn('Available job IDs:', [...jobIds]);
        console.warn('Dependency IDs:', [...depIds]);
      } else {
        console.log('✅ All dependency IDs match job IDs');
      }
    }
  }, [jobs, dependencies]);

  const handleNodeClick = (jobId: string) => {
    setSelectedJobId(jobId);
  };

  const addJobToWorkflow = () => {
    setShowAddJobModal(true);
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-muted-foreground flex items-center justify-center gap-2">
        <span className="w-4 h-4 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
        Loading workflow details…
      </div>
    );
  }

  const filteredJobs = jobs.filter(
    (job) =>
      job.job.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.jobId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!workflow) {
    return (
      <div className="card p-12 text-center">
        <p className="text-muted-foreground">Workflow not found</p>
        <Link href="/workflows" className="btn-primary mt-4 inline-flex">
          Back to Workflows
        </Link>
      </div>
    );
  }

  const selectedJob = jobs.find((j) => j.id === selectedJobId);

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border bg-secondary/30 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Link href="/" className="hover:text-primary transition-colors">
                Home
              </Link>
              <ChevronRightIcon width={12} height={12} />
              <Link href="/workflows" className="hover:text-primary transition-colors">
                Workflows
              </Link>
              <ChevronRightIcon width={12} height={12} />
              <span className="text-foreground font-medium">{workflow.name}</span>
            </nav>
            <span
              className={`ml-3 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                workflow.status === 'ACTIVE'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : workflow.status === 'PAUSED'
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    : 'bg-zinc-800 text-zinc-500 border-zinc-700'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  workflow.status === 'ACTIVE'
                    ? 'bg-emerald-400'
                    : workflow.status === 'PAUSED'
                      ? 'bg-amber-400'
                      : 'bg-zinc-500'
                }`}
              />
              {workflow.status}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ClockIcon width={14} height={14} />
              <span>
                {workflow.scheduleType} ({workflow.scheduleExpression})
              </span>
            </div>
            <div className="w-px h-4 bg-border" />
            <button
              onClick={() => {
                fetchWorkflow();
                fetchWorkflowJobs();
                fetchDependencies();
                toast.success('Refreshed');
              }}
              className="btn-secondary text-xs py-1"
            >
              <ArrowPathIcon width={14} height={14} />
              Refresh
            </button>
            <button
              onClick={() => {
                toast.info('Run workflow coming soon! 🚀');
              }}
              className="btn-primary text-xs py-1"
            >
              <PlayIcon width={14} height={14} />
              Run
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Workflow Jobs */}
        <div
          className={`flex-shrink-0 border-r border-border bg-secondary/20 overflow-y-auto transition-all duration-300 ${showLeftPanel ? 'w-72' : 'w-12'}`}
        >
          <div className="p-3 flex items-center justify-between border-b border-border">
            {showLeftPanel ? (
              <>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Jobs ({jobs.length})
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={addJobToWorkflow}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors text-xs font-medium"
                  >
                    <PlusIcon width={14} height={14} />
                    Add Job
                  </button>
                  <button
                    onClick={() => setShowLeftPanel(false)}
                    className="p-1 rounded hover:bg-secondary text-muted-foreground"
                  >
                    <XMarkIcon width={16} height={16} />
                  </button>
                </div>
              </>
            ) : (
              <button
                onClick={() => setShowLeftPanel(true)}
                className="p-1 rounded hover:bg-secondary text-muted-foreground"
              >
                <Square2StackIcon width={20} height={20} />
              </button>
            )}
          </div>

          {showLeftPanel && (
            <div className="p-3 space-y-3">
              {/* Search */}
              <div className="relative">
                <MagnifyingGlassIcon
                  width={14}
                  height={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  type="text"
                  placeholder="Search jobs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-secondary border border-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Filtered Job List */}
              {filteredJobs.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 rounded-xl bg-secondary border border-border flex items-center justify-center mx-auto mb-3">
                    <Square2StackIcon
                      width={24}
                      height={24}
                      className="text-muted-foreground opacity-50"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {searchQuery ? 'No jobs match your search' : 'No jobs in this workflow'}
                  </p>
                  {!searchQuery && (
                    <button
                      onClick={addJobToWorkflow}
                      className="mt-3 text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1 mx-auto"
                    >
                      <PlusIcon width={14} height={14} />
                      Add your first job
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-1.5">
                  {filteredJobs.map((job, index) => {
                    const statusColor = getStatusColor(job.job.status);
                    const statusDot = getStatusDot(job.job.status);
                    const isSelected = selectedJobId === job.id;

                    return (
                      <button
                        key={job.id || `job-${index}`}
                        onClick={() => handleNodeClick(job.id)}
                        className={`w-full text-left px-3 py-2 rounded-lg transition-all duration-200 border ${
                          isSelected
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:border-primary/30 hover:bg-secondary/50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono-data text-foreground truncate flex-1">
                            {job.job.type}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium border ${statusColor}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${statusDot}`} />
                            {job.job.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-muted-foreground font-mono-data">
                            P{job.job.priority}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono-data truncate">
                            {job.jobId?.slice(0, 12) || '---'}...
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Center - Canvas */}
        <div className="flex-1 overflow-hidden bg-muted/10">
          <WorkflowCanvas
            jobs={jobs}
            dependencies={dependencies}
            workflowId={workflowId}
            onNodeClick={handleNodeClick}
            onJobsUpdated={fetchWorkflowJobs}
            onDependenciesUpdated={fetchDependencies}
          />
        </div>

        {/* Right Panel - Node Configuration */}
        <div className="flex-shrink-0 w-72 border-l border-border bg-secondary/20 overflow-y-auto p-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Node Config
            </span>
          </div>

          {selectedJob ? (
            <div className="space-y-3">
              <div className="bg-card border border-border rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Job Type</p>
                <p className="text-sm font-mono-data text-foreground">{selectedJob.job.type}</p>
              </div>

              <div className="bg-card border border-border rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Status</p>
                <span
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(selectedJob.job.status)}`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${getStatusDot(selectedJob.job.status)}`}
                  />
                  {selectedJob.job.status}
                </span>
              </div>

              <div className="bg-card border border-border rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Priority</p>
                <p className="text-sm font-mono-data text-foreground">{selectedJob.job.priority}</p>
              </div>

              <div className="bg-card border border-border rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Job ID</p>
                <p className="text-xs font-mono-data text-muted-foreground truncate">
                  {selectedJob.jobId}
                </p>
              </div>

              <div className="bg-card border border-border rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Dependencies</p>
                {dependencies.filter(
                  (d) =>
                    d.childWorkflowJobId === selectedJob.id ||
                    d.parentWorkflowJobId === selectedJob.id
                ).length > 0 ? (
                  <div className="space-y-1 mt-1">
                    {dependencies
                      .filter((d) => d.parentWorkflowJobId === selectedJob.id)
                      .map((d) => {
                        const child = jobs.find((j) => j.id === d.childWorkflowJobId);
                        return (
                          child && (
                            <p key={d.id} className="text-xs text-emerald-400">
                              → {child.job.type}
                            </p>
                          )
                        );
                      })}
                    {dependencies
                      .filter((d) => d.childWorkflowJobId === selectedJob.id)
                      .map((d) => {
                        const parent = jobs.find((j) => j.id === d.parentWorkflowJobId);
                        return (
                          parent && (
                            <p key={d.id} className="text-xs text-blue-400">
                              ← {parent.job.type}
                            </p>
                          )
                        );
                      })}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">No dependencies</p>
                )}
              </div>

              <div className="bg-card border border-border rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Configuration</p>
                <div className="mt-2 bg-secondary/30 rounded p-2">
                  <pre className="text-xs font-mono-data text-muted-foreground whitespace-pre-wrap">
                    {JSON.stringify(
                      {
                        timeout: '30s',
                        retries: 3,
                        priority: selectedJob.job.priority,
                      },
                      null,
                      2
                    )}
                  </pre>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Cog6ToothIcon
                width={32}
                height={32}
                className="text-muted-foreground mx-auto mb-2 opacity-50"
              />
              <p className="text-xs text-muted-foreground">Select a node on the canvas</p>
              <p className="text-xs text-muted-foreground mt-1">to view and edit configuration</p>
            </div>
          )}
        </div>
      </div>

      <AddJobToWorkflowModal
        isOpen={showAddJobModal}
        onClose={() => setShowAddJobModal(false)}
        workflowId={workflowId}
        existingJobIds={jobs.map((j) => j.jobId)}
        onJobsAdded={() => {
          fetchWorkflowJobs();
          fetchDependencies();
          toast.success('Jobs refreshed');
        }}
      />
    </div>
  );
}