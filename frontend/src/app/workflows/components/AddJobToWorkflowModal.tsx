'use client';

import React, { useState, useEffect } from 'react';
import { XMarkIcon, MagnifyingGlassIcon, PlusIcon, CheckIcon } from '@heroicons/react/24/outline';
import { toast } from 'sonner';

interface Job {
  id: string;
  type: string;
  status: string;
  priority: number;
  payload: Record<string, unknown>;
  scheduledAt: string;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  retryCount: number;
  maxRetries: number;
  assignedWorker: string | null;
  heartbeatAt: string | null;
  lockExpiresAt: string | null;
  lastError: string | null;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  workflowId: string;
  existingJobIds: string[];
  onJobsAdded: () => void;
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

export default function AddJobToWorkflowModal({
  isOpen,
  onClose,
  workflowId,
  existingJobIds,
  onJobsAdded,
}: Props) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJobIds, setSelectedJobIds] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch all jobs
  useEffect(() => {
    if (!isOpen) return;

    const fetchJobs = async () => {
      setLoading(true);
      try {
        const response = await fetch('http://localhost:3000/jobs');
        if (!response.ok) throw new Error('Failed to fetch jobs');
        const data = await response.json();
        
        // Response: { length: 6, jobs: [...] }
        const jobList = data.jobs || [];
        
        // Filter out jobs already in workflow
        const availableJobs = jobList.filter(
          (job: Job) => !existingJobIds.includes(job.id)
        );
        setJobs(availableJobs);
        setSelectedJobIds(new Set());
      } catch (err) {
        console.error('Error fetching jobs:', err);
        toast.error('Failed to load jobs');
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, [isOpen, existingJobIds]);

  // Filter jobs based on search
  const filteredJobs = jobs.filter(
    (job) =>
      job.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleJobSelection = (jobId: string) => {
    setSelectedJobIds((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) next.delete(jobId);
      else next.add(jobId);
      return next;
    });
  };

  const handleAddJobs = async () => {
    if (selectedJobIds.size === 0) {
      toast.error('Please select at least one job');
      return;
    }

    setIsSubmitting(true);
    try {
      const jobIdsArray = Array.from(selectedJobIds);
      
      const response = await fetch(`http://localhost:3000/workflow/${workflowId}/jobs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobIds: jobIdsArray,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to add jobs: ${response.statusText}`);
      }

      const result = await response.json();
      
      toast.success(`${jobIdsArray.length} job(s) added to workflow!`, {
        description: `Successfully added to workflow`,
      });

      setSelectedJobIds(new Set());
      onJobsAdded();
      onClose();
    } catch (err) {
      console.error('Error adding jobs:', err);
      toast.error('Failed to add jobs to workflow');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-secondary/30 flex-shrink-0">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Add Jobs to Workflow</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Select existing jobs to add to this workflow
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
          >
            <XMarkIcon width={20} height={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Search */}
          <div className="relative mb-4">
            <MagnifyingGlassIcon
              width={16}
              height={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="text"
              placeholder="Search jobs by type or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-secondary border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Job List */}
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-14 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm">
                {searchQuery ? 'No jobs match your search' : 'No jobs available to add'}
              </p>
              <p className="text-xs mt-1">
                {searchQuery ? 'Try adjusting your search' : 'All existing jobs are already in this workflow'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Select All / Clear All */}
              {filteredJobs.length > 0 && (
                <div className="flex items-center justify-between pb-2 border-b border-border/50">
                  <span className="text-xs text-muted-foreground">
                    {selectedJobIds.size} of {filteredJobs.length} selected
                  </span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        const allIds = new Set(filteredJobs.map(j => j.id));
                        setSelectedJobIds(allIds);
                      }}
                      className="text-xs text-primary hover:text-primary/80 transition-colors"
                    >
                      Select All
                    </button>
                    <button
                      onClick={() => setSelectedJobIds(new Set())}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Clear All
                    </button>
                  </div>
                </div>
              )}

              {filteredJobs.map((job) => {
                const statusColor = getStatusColor(job.status);
                const statusDot = getStatusDot(job.status);
                const isSelected = selectedJobIds.has(job.id);

                return (
                  <button
                    key={job.id}
                    onClick={() => toggleJobSelection(job.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/20 hover:bg-secondary/30'
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 ${
                        isSelected
                          ? 'border-primary bg-primary'
                          : 'border-border'
                      }`}>
                        {isSelected && (
                          <CheckIcon width={14} height={14} className="text-white" />
                        )}
                      </div>
                      <div className="text-left flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {job.type}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono-data truncate">
                          {job.id}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-xs text-muted-foreground font-mono-data">
                        P{job.priority}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${statusColor}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${statusDot}`} />
                        {job.status}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-secondary/30 flex-shrink-0">
          <span className="text-xs text-muted-foreground">
            {selectedJobIds.size} job{selectedJobIds.size !== 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center gap-3">
            <button type="button" onClick={onClose} className="btn-secondary text-sm">
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAddJobs}
              disabled={isSubmitting || selectedJobIds.size === 0}
              className="btn-primary min-w-32 justify-center text-sm"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
                  Adding…
                </>
              ) : (
                <>
                  <PlusIcon width={16} height={16} />
                  Add to Workflow
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}