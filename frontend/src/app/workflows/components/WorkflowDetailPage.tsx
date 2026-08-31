'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  ChevronRightIcon,
  PlayIcon,
  PauseIcon,
  ArrowPathIcon,
  ClockIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
  TagIcon,
  GlobeAltIcon,
  InformationCircleIcon,
  CalendarDaysIcon,
  Squares2X2Icon,
  PlayCircleIcon,
} from '@heroicons/react/24/outline';
import VisualBuilder from './VisualBuilder';

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

interface Props {
  workflowId: string;
}

function formatDate(ts: string | null): string {
  if (!ts) return '—';
  try {
    const date = new Date(ts);
    if (isNaN(date.getTime())) return '—';
    return date.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  } catch {
    return '—';
  }
}

function formatRelativeTime(ts: string | null): string {
  if (!ts) return '—';
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 30) return `${diffD}d ago`;
  return formatDate(ts);
}

function getStatusBadge(status: WorkflowStatus) {
  const config = {
    ACTIVE: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', dot: 'bg-emerald-400' },
    PAUSED: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', dot: 'bg-amber-400' },
    ARCHIVED: { bg: 'bg-zinc-800', text: 'text-zinc-500', border: 'border-zinc-700', dot: 'bg-zinc-500' },
  };
  return config[status];
}

function getScheduleTypeLabel(type: ScheduleType): string {
  const labels = {
    ONCE: 'Once',
    INTERVAL: 'Interval',
    CRON: 'Cron',
  };
  return labels[type];
}

export default function WorkflowDetailPage({ workflowId }: Props) {
  const router = useRouter();
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'builder'>('details');

  const fetchWorkflow = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`http://localhost:3000/workflow/${workflowId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch workflow: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('📦 Workflow data:', data);
      
      let workflowData = data;
      if (data.workflows && Array.isArray(data.workflows) && data.workflows.length > 0) {
        workflowData = data.workflows[0];
      } else if (data.workflow) {
        workflowData = data.workflow;
      }
      
      setWorkflow(workflowData);
    } catch (err) {
      console.error('Error fetching workflow:', err);
      setError(err instanceof Error ? err.message : 'Failed to load workflow');
      toast.error('Failed to load workflow');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkflow();
  }, [workflowId]);

  const handleRun = () => {
    toast.info('⏳ Run workflow coming soon!', {
      description: 'Workflow execution will be available soon',
    });
  };

  const handlePause = async () => {
    if (!workflow) return;
    const newStatus = workflow.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    
    try {
      const response = await fetch(`http://localhost:3000/workflow/${workflowId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      
      if (!response.ok) throw new Error('Failed to update workflow');
      
      setWorkflow({ ...workflow, status: newStatus });
      toast.success(newStatus === 'ACTIVE' ? 'Workflow resumed' : 'Workflow paused');
    } catch (err) {
      console.error('Error updating workflow:', err);
      toast.error('Failed to update workflow');
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-muted-foreground flex items-center justify-center gap-2">
        <span className="w-4 h-4 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
        Loading workflow details…
      </div>
    );
  }

  if (error || !workflow) {
    return (
      <div className="card p-12 text-center max-w-lg mx-auto mt-12">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <DocumentTextIcon width={28} height={28} className="text-red-400" />
          </div>
          <p className="text-sm font-medium text-foreground">Workflow not found</p>
          <p className="text-xs text-muted-foreground">{error || 'Could not find the requested workflow'}</p>
          <Link href="/workflows" className="btn-primary text-sm mt-2">
            Back to Workflows
          </Link>
        </div>
      </div>
    );
  }

  const statusBadge = getStatusBadge(workflow.status);

  return (
    <div className="p-6 max-w-screen-2xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link href="/" className="hover:text-primary transition-colors">
          Home
        </Link>
        <ChevronRightIcon width={12} height={12} />
        <Link href="/workflows" className="hover:text-primary transition-colors">
          Workflows
        </Link>
        <ChevronRightIcon width={12} height={12} />
        <span className="text-foreground font-medium truncate max-w-48">{workflow.name}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-semibold text-foreground">{workflow.name}</h1>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${statusBadge.bg} ${statusBadge.text} ${statusBadge.border}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${statusBadge.dot}`} />
              {workflow.status}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={fetchWorkflow}
            className="btn-secondary text-xs py-1.5"
          >
            <ArrowPathIcon width={14} height={14} />
            Refresh
          </button>
          {workflow.status !== 'ARCHIVED' && (
            <button
              onClick={handlePause}
              className={`text-xs py-1.5 ${workflow.status === 'ACTIVE' ? 'btn-secondary' : 'btn-primary'}`}
            >
              {workflow.status === 'ACTIVE' ? (
                <>
                  <PauseIcon width={14} height={14} />
                  Pause
                </>
              ) : (
                <>
                  <PlayIcon width={14} height={14} />
                  Resume
                </>
              )}
            </button>
          )}
          {workflow.status === 'ACTIVE' && (
            <button
              onClick={handleRun}
              className="btn-primary text-xs py-1.5"
            >
              <PlayIcon width={14} height={14} />
              Run
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border">
        <button
          onClick={() => setActiveTab('details')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${
            activeTab === 'details'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
          }`}
        >
          <DocumentTextIcon width={16} height={16} />
          Details
        </button>
        <button
          onClick={() => setActiveTab('builder')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${
            activeTab === 'builder'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
          }`}
        >
          <Squares2X2Icon width={16} height={16} />
          Visual Builder
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'details' ? (
        /* === DETAILS TAB === */
        <div className="space-y-6">
          {/* Description */}
          <div className="card p-5 bg-primary/5 border-primary/20">
            <div className="flex items-start gap-3">
              <InformationCircleIcon width={20} height={20} className="text-primary flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Description</p>
                <p className="text-sm text-foreground leading-relaxed">
                  {workflow.description || 'No description provided for this workflow'}
                </p>
              </div>
            </div>
          </div>

          {/* All Workflow Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Basic Info */}
            <div className="card p-5 space-y-3">
              <div className="flex items-center gap-2 text-muted-foreground border-b border-border pb-2">
                <DocumentTextIcon width={16} height={16} />
                <span className="text-xs font-medium uppercase tracking-wider">Basic Info</span>
              </div>
              <div className="space-y-2.5">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Workflow ID</p>
                  <p className="text-xs font-mono-data text-foreground truncate">{workflow.id}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Name</p>
                  <p className="text-sm font-medium text-foreground">{workflow.name}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Status</p>
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${statusBadge.bg} ${statusBadge.text} ${statusBadge.border}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${statusBadge.dot}`} />
                    {workflow.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Schedule */}
            <div className="card p-5 space-y-3">
              <div className="flex items-center gap-2 text-muted-foreground border-b border-border pb-2">
                <ClockIcon width={16} height={16} />
                <span className="text-xs font-medium uppercase tracking-wider">Schedule</span>
              </div>
              <div className="space-y-2.5">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Type</p>
                  <p className="text-sm font-medium text-foreground">{getScheduleTypeLabel(workflow.scheduleType)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Expression</p>
                  <p className="text-sm font-mono-data text-foreground">{workflow.scheduleExpression}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Timezone</p>
                  <div className="flex items-center gap-1.5">
                    <GlobeAltIcon width={14} height={14} className="text-muted-foreground" />
                    <span className="text-sm text-foreground">{workflow.timezone}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Timing */}
            <div className="card p-5 space-y-3">
              <div className="flex items-center gap-2 text-muted-foreground border-b border-border pb-2">
                <CalendarDaysIcon width={16} height={16} />
                <span className="text-xs font-medium uppercase tracking-wider">Timing</span>
              </div>
              <div className="space-y-2.5">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Created At</p>
                  <p className="text-sm text-foreground">{formatDate(workflow.createdAt)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Last Updated</p>
                  <p className="text-sm text-foreground">{formatRelativeTime(workflow.updatedAt)}</p>
                </div>
                {workflow.startAt && (
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Start At</p>
                    <p className="text-sm text-foreground">{formatDate(workflow.startAt)}</p>
                  </div>
                )}
                {workflow.endAt && (
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">End At</p>
                    <p className="text-sm text-foreground">{formatDate(workflow.endAt)}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Metadata */}
          <div className="card p-5 space-y-3">
            <div className="flex items-center gap-2 text-muted-foreground border-b border-border pb-2">
              <TagIcon width={16} height={16} />
              <span className="text-xs font-medium uppercase tracking-wider">Metadata</span>
            </div>
            {workflow.metadata && Object.keys(workflow.metadata).length > 0 ? (
              <div className="bg-muted rounded-lg p-4 overflow-x-auto">
                <pre className="text-xs font-mono-data text-foreground whitespace-pre-wrap">
                  {JSON.stringify(workflow.metadata, null, 2)}
                </pre>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">No metadata available</p>
            )}
          </div>
        </div>
      ) : activeTab === 'builder' ? (
        /* === VISUAL BUILDER TAB === */
        <VisualBuilder workflowId={workflowId} workflowName={workflow.name} />
      ) : null}
    </div>
  );
}