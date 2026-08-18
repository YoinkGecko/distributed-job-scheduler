'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  ArrowsRightLeftIcon,
  PlayIcon,
  PauseIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  CalendarDaysIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  CalendarIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import CreateWorkflowModal from './CreateWorkflowModal';

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

const statusConfig: Record<WorkflowStatus, { label: string; className: string; dotClass: string }> =
  {
    ACTIVE: {
      label: 'Active',
      className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      dotClass: 'bg-emerald-400',
    },
    PAUSED: {
      label: 'Paused',
      className: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      dotClass: 'bg-amber-400',
    },
    ARCHIVED: {
      label: 'Archived',
      className: 'bg-zinc-800 text-zinc-500 border-zinc-700',
      dotClass: 'bg-zinc-600',
    },
  };

const scheduleTypeConfig: Record<ScheduleType, { label: string; icon: React.ElementType; className: string }> =
  {
    ONCE: {
      label: 'Once',
      icon: CalendarIcon,
      className: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    },
    INTERVAL: {
      label: 'Interval',
      icon: ArrowPathIcon,
      className: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    },
    CRON: {
      label: 'Cron',
      icon: ClockIcon,
      className: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
    },
  };

function formatDate(ts: string | null): string {
  if (!ts) return 'Never';
  try {
    const date = new Date(ts);
    if (isNaN(date.getTime())) return 'Invalid date';
    return date.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return 'Invalid date';
  }
}

function formatRelativeTime(ts: string | null): string {
  if (!ts) return 'Never';
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  return formatDate(ts);
}

function getScheduleDisplay(scheduleType: ScheduleType, expression: string): string {
  switch (scheduleType) {
    case 'ONCE':
      return formatDate(expression);
    case 'INTERVAL':
      return `Every ${expression}`;
    case 'CRON':
      return expression;
    default:
      return expression;
  }
}

export default function WorkflowsContent() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<WorkflowStatus | 'ALL'>('ALL');

  // Fetch workflows from API
  const fetchWorkflows = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3000/workflow/');
      if (!response.ok) {
        throw new Error(`Failed to fetch workflows: ${response.statusText}`);
      }
      const data = await response.json();
      // Response: { length: 6, workflows: [...] }
      const workflowList = data.workflows || [];
      setWorkflows(workflowList);
    } catch (err) {
      console.error('Error fetching workflows:', err);
      toast.error('Failed to load workflows');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const filtered = workflows.filter((wf) => {
    const matchSearch =
      !search ||
      wf.name.toLowerCase().includes(search.toLowerCase()) ||
      (wf.description && wf.description.toLowerCase().includes(search.toLowerCase()));
    const matchStatus = statusFilter === 'ALL' || wf.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalActive = workflows.filter((w) => w.status === 'ACTIVE').length;
  const totalArchived = workflows.filter((w) => w.status === 'ARCHIVED').length;
  const totalPaused = workflows.filter((w) => w.status === 'PAUSED').length;

  async function togglePause(id: string) {
    const wf = workflows.find((w) => w.id === id);
    if (!wf) return;

    const newStatus = wf.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';

    try {
      const response = await fetch(`http://localhost:3000/workflow/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update workflow: ${response.statusText}`);
      }

      // Update local state
      setWorkflows((prev) =>
        prev.map((w) => (w.id === id ? { ...w, status: newStatus } : w))
      );

      toast.success(wf.status === 'ACTIVE' ? 'Workflow paused' : 'Workflow resumed', {
        description: wf.name,
      });
    } catch (err) {
      console.error('Error toggling workflow:', err);
      toast.error('Failed to update workflow status');
    }
  }

  async function handleTriggerManual(id: string) {
    const wf = workflows.find((w) => w.id === id);
    if (!wf) return;

    try {
      const response = await fetch(`http://localhost:3000/workflow/${id}/trigger`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`Failed to trigger workflow: ${response.statusText}`);
      }

      toast.success('Workflow triggered', { description: `${wf.name} run started` });
    } catch (err) {
      console.error('Error triggering workflow:', err);
      toast.error('Failed to trigger workflow');
    }
  }

  const kpiCards = [
    {
      key: 'wf-kpi-active',
      label: 'Active Workflows',
      value: totalActive,
      icon: CheckCircleIcon,
      iconBg: 'bg-emerald-500/10',
      iconClass: 'text-emerald-400',
      valueClass: 'text-emerald-400',
      note: `of ${workflows.length} total`,
    },
    {
      key: 'wf-kpi-paused',
      label: 'Paused',
      value: totalPaused,
      icon: PauseIcon,
      iconBg: 'bg-amber-500/10',
      iconClass: 'text-amber-400',
      valueClass: 'text-amber-400',
      note: 'Waiting to resume',
    },
    {
      key: 'wf-kpi-archived',
      label: 'Archived',
      value: totalArchived,
      icon: ArrowsRightLeftIcon,
      iconBg: 'bg-zinc-500/10',
      iconClass: 'text-zinc-400',
      valueClass: 'text-zinc-400',
      note: 'Historical workflows',
    },
    {
      key: 'wf-kpi-total',
      label: 'Total Workflows',
      value: workflows.length,
      icon: CalendarDaysIcon,
      iconBg: 'bg-primary/10',
      iconClass: 'text-primary',
      valueClass: 'text-foreground',
      note: 'All workflows',
    },
  ];

  return (
    <div className="space-y-6 max-w-screen-2xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Workflows</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage scheduled workflows and job pipelines
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchWorkflows}
            className="btn-secondary text-sm"
            disabled={loading}
          >
            <ArrowPathIcon width={16} height={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button onClick={() => setShowCreateModal(true)} className="btn-primary">
            <PlusIcon width={16} height={16} />
            New Workflow
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4 gap-4">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.key} className="card p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="metric-label">{card.label}</span>
                <div
                  className={`w-8 h-8 rounded-lg ${card.iconBg} flex items-center justify-center`}
                >
                  <Icon className={card.iconClass} width={16} height={16} />
                </div>
              </div>
              <div>
                <p className={`text-hero-metric ${card.valueClass}`}>{card.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{card.note}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <MagnifyingGlassIcon
            width={15}
            height={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            placeholder="Search workflows…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-9 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          {(['ALL', 'ACTIVE', 'PAUSED', 'ARCHIVED'] as const).map((s) => (
            <button
              key={`wf-filter-${s}`}
              onClick={() => setStatusFilter(s)}
              className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-all ${
                statusFilter === s
                  ? 'bg-primary/10 text-primary border-primary/30'
                  : 'bg-secondary text-muted-foreground border-border hover:text-foreground'
              }`}
            >
              {s === 'ALL' ? 'All' : s}
            </button>
          ))}
        </div>
        <span className="ml-auto text-xs text-muted-foreground">
          {filtered.length} workflow{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Workflow cards grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="h-4 bg-muted rounded w-3/4 mb-2" />
              <div className="h-3 bg-muted rounded w-1/2 mb-4" />
              <div className="h-3 bg-muted rounded w-full mb-2" />
              <div className="h-3 bg-muted rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-16 flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-secondary border border-border flex items-center justify-center">
            <ArrowsRightLeftIcon width={28} height={28} className="text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">No workflows found</p>
          <p className="text-xs text-muted-foreground text-center max-w-xs">
            {search || statusFilter !== 'ALL'
              ? 'No workflows match your current filters. Try adjusting the status filter or clearing your search.'
              : 'Create your first workflow to get started.'}
          </p>
          <button
            onClick={() => {
              setSearch('');
              setStatusFilter('ALL');
            }}
            className="btn-secondary text-xs"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-3 gap-5">
          {filtered.map((wf) => (
            <WorkflowCard
              key={wf.id}
              workflow={wf}
              onTogglePause={togglePause}
              onTrigger={handleTriggerManual}
            />
          ))}
        </div>
      )}

      <CreateWorkflowModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={() => {
          fetchWorkflows();
          toast.success('Workflows refreshed');
        }}
      />
    </div>
  );
}

function WorkflowCard({
  workflow: wf,
  onTogglePause,
  onTrigger,
}: {
  workflow: Workflow;
  onTogglePause: (id: string) => void;
  onTrigger: (id: string) => void;
}) {
  const status = statusConfig[wf.status];
  const schedule = scheduleTypeConfig[wf.scheduleType];
  const ScheduleIcon = schedule.icon;

  return (
    <div className="card p-5 flex flex-col gap-4 hover:border-border/80 transition-all duration-200">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="text-sm font-semibold text-foreground truncate">{wf.name}</h3>
            <span
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${status.className}`}
            >
              <span className={`status-dot ${status.dotClass}`} />
              {status.label}
            </span>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {wf.description || 'No description'}
          </p>
        </div>
      </div>

      {/* Schedule info */}
      <div className="flex items-center gap-3 flex-wrap">
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium border ${schedule.className}`}
        >
          <ScheduleIcon width={11} height={11} />
          {schedule.label}
          <span className="font-mono-data opacity-70 text-xs ml-1">
            {getScheduleDisplay(wf.scheduleType, wf.scheduleExpression)}
          </span>
        </span>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <ClockIcon width={11} height={11} />
          Created: <span className="text-foreground">{formatRelativeTime(wf.createdAt)}</span>
        </div>
      </div>

      {/* Time range if set */}
      {(wf.startAt || wf.endAt) && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/30 rounded-lg px-3 py-1.5">
          <CalendarIcon width={12} height={12} />
          {wf.startAt && <span>From: {formatDate(wf.startAt)}</span>}
          {wf.startAt && wf.endAt && <span>→</span>}
          {wf.endAt && <span>To: {formatDate(wf.endAt)}</span>}
        </div>
      )}

      {/* Timezone */}
      <div className="text-xs text-muted-foreground">
        <span className="font-medium">Timezone:</span> {wf.timezone}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-3 border-t border-border/50">
        {wf.status === 'ACTIVE' && (
          <button
            onClick={() => onTrigger(wf.id)}
            className="btn-primary text-xs py-1.5 flex-1 justify-center"
          >
            <PlayIcon width={13} height={13} />
            Run Now
          </button>
        )}
        {wf.status !== 'ARCHIVED' && (
          <button
            onClick={() => onTogglePause(wf.id)}
            className={`text-xs py-1.5 flex-1 justify-center ${
              wf.status === 'ACTIVE' ? 'btn-secondary' : 'btn-primary'
            }`}
          >
            {wf.status === 'ACTIVE' ? (
              <>
                <PauseIcon width={13} height={13} />
                Pause
              </>
            ) : (
              <>
                <PlayIcon width={13} height={13} />
                Resume
              </>
            )}
          </button>
        )}
        <span className="text-xs text-muted-foreground font-mono-data ml-auto">
          {wf.id.slice(0, 8)}...
        </span>
      </div>
    </div>
  );
}