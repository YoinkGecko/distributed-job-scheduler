'use client';

import React, { useState } from 'react';
import { mockWorkflows } from '@/lib/mockData';
import type { Workflow } from '@/lib/mockData';
import { toast } from 'sonner';
import {
  ArrowsRightLeftIcon,
  PlayIcon,
  PauseIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  BoltIcon,
  CalendarDaysIcon,
  CursorArrowRaysIcon,
  GlobeAltIcon,
  PlusIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import Icon from '@/components/ui/AppIcon';
import CreateWorkflowModal from './CreateWorkflowModal';

type WorkflowStatus = Workflow['status'];
type TriggerType = Workflow['triggerType'];

const statusConfig: Record<WorkflowStatus, { label: string; className: string; dotClass: string }> =
  {
    ACTIVE: {
      label: 'Active',
      className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      dotClass: 'bg-emerald-400 status-dot-running',
    },
    PAUSED: {
      label: 'Paused',
      className: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      dotClass: 'bg-amber-400',
    },
    DRAFT: {
      label: 'Draft',
      className: 'bg-zinc-800 text-zinc-400 border-zinc-700',
      dotClass: 'bg-zinc-500',
    },
    ARCHIVED: {
      label: 'Archived',
      className: 'bg-zinc-800 text-zinc-500 border-zinc-700',
      dotClass: 'bg-zinc-600',
    },
  };

const triggerConfig: Record<
  TriggerType,
  { label: string; icon: React.ElementType; className: string }
> = {
  CRON: {
    label: 'Cron',
    icon: ClockIcon,
    className: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  },
  EVENT: {
    label: 'Event',
    icon: BoltIcon,
    className: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  },
  MANUAL: {
    label: 'Manual',
    icon: CursorArrowRaysIcon,
    className: 'bg-zinc-800 text-zinc-400 border-zinc-700',
  },
  WEBHOOK: {
    label: 'Webhook',
    icon: GlobeAltIcon,
    className: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
  },
};

function formatTs(ts: string | null): string {
  if (!ts) return 'Never';
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  return ts.slice(0, 10);
}

export default function WorkflowsContent() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [workflows, setWorkflows] = useState<Workflow[]>(mockWorkflows);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<WorkflowStatus | 'ALL'>('ALL');

  const filtered = workflows.filter((wf) => {
    const matchSearch =
      !search ||
      wf.name.toLowerCase().includes(search.toLowerCase()) ||
      wf.description.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || wf.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalActive = workflows.filter((w) => w.status === 'ACTIVE').length;
  const activeJobs = workflows.reduce((s, w) => s + w.activeJobs, 0);
  const completedToday = workflows.reduce((s, w) => s + w.completedToday, 0);
  const failedWorkflows = workflows.filter(
    (w) => w.lastRunStatus === 'FAILED' || w.lastRunStatus === 'DEAD'
  ).length;

  function togglePause(id: string) {
    // Backend integration point: PATCH /api/workflows/:id { status: 'PAUSED' | 'ACTIVE' }
    setWorkflows((prev) =>
      prev.map((w) =>
        w.id === id ? { ...w, status: w.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE' } : w
      )
    );
    const wf = workflows.find((w) => w.id === id);
    if (wf) {
      toast.success(wf.status === 'ACTIVE' ? 'Workflow paused' : 'Workflow resumed', {
        description: wf.name,
      });
    }
  }

  function handleTriggerManual(id: string) {
    // Backend integration point: POST /api/workflows/:id/trigger
    const wf = workflows.find((w) => w.id === id);
    toast.success('Workflow triggered', { description: `${wf?.name} run started` });
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
      key: 'wf-kpi-running',
      label: 'Jobs Running',
      value: activeJobs,
      icon: PlayIcon,
      iconBg: 'bg-blue-500/10',
      iconClass: 'text-blue-400',
      valueClass: 'text-blue-400',
      note: 'across all workflows',
    },
    {
      key: 'wf-kpi-completed',
      label: 'Completed Today',
      value: completedToday,
      icon: CalendarDaysIcon,
      iconBg: 'bg-primary/10',
      iconClass: 'text-primary',
      valueClass: 'text-foreground',
      note: 'job executions',
    },
    {
      key: 'wf-kpi-failed',
      label: 'Failed Last Run',
      value: failedWorkflows,
      icon: ExclamationTriangleIcon,
      iconBg: 'bg-red-500/10',
      iconClass: 'text-red-400',
      valueClass: 'text-red-400',
      note: failedWorkflows > 0 ? 'Needs review' : 'All healthy',
      alert: failedWorkflows > 0,
    },
  ];

  return (
    <div className="space-y-6 max-w-screen-2xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Workflows</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage multi-step job pipelines and orchestration rules
          </p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn-primary">
          <PlusIcon width={16} height={16} />
          New Workflow
        </button>
      </div>

      {/* KPI cards — 4 cards, 4-col grid */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4 gap-4">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.key}
              className={`card p-4 flex flex-col gap-3 ${
                card.alert ? 'border-red-500/30 bg-red-500/5' : ''
              }`}
            >
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
          {(['ALL', 'ACTIVE', 'PAUSED', 'DRAFT', 'ARCHIVED'] as const).map((s) => (
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
      {filtered.length === 0 ? (
        <div className="card p-16 flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-secondary border border-border flex items-center justify-center">
            <ArrowsRightLeftIcon width={28} height={28} className="text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">No workflows found</p>
          <p className="text-xs text-muted-foreground text-center max-w-xs">
            No workflows match your current filters. Try adjusting the status filter or clearing
            your search.
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
        // onCreated={() => {
        //   // Optionally refresh the workflow list
        //   toast.success('Workflows refreshed');
        // }}
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
  const trigger = triggerConfig[wf.triggerType];
  const TriggerIcon = trigger.icon;

  const lastRunStatusConfig = wf.lastRunStatus
    ? {
        WAITING: 'text-zinc-400',
        PENDING: 'text-blue-400',
        RUNNING: 'text-emerald-400',
        COMPLETED: 'text-teal-400',
        FAILED: 'text-amber-400',
        DEAD: 'text-red-400',
      }[wf.lastRunStatus]
    : 'text-muted-foreground';

  return (
    <div
      className={`card p-5 flex flex-col gap-4 hover:border-border/80 transition-all duration-200 ${
        wf.lastRunStatus === 'FAILED' || wf.lastRunStatus === 'DEAD' ? 'border-amber-500/20' : ''
      }`}
    >
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
            {wf.description}
          </p>
        </div>
      </div>

      {/* Meta row */}
      <div className="flex items-center gap-3 flex-wrap">
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium border ${trigger.className}`}
        >
          <TriggerIcon width={11} height={11} />
          {trigger.label}
          {wf.cronExpression && (
            <span className="font-mono-data opacity-70 text-xs">{wf.cronExpression}</span>
          )}
        </span>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <ClockIcon width={11} height={11} />
          Last run: <span className="text-foreground">{formatTs(wf.lastRunAt)}</span>
          {wf.lastRunStatus && (
            <span className={`font-medium ${lastRunStatusConfig}`}>({wf.lastRunStatus})</span>
          )}
        </div>
      </div>

      {/* Step chain */}
      <div>
        <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide font-medium">
          Steps ({wf.steps.length})
        </p>
        <div className="flex items-center gap-1 flex-wrap">
          {wf.steps.map((step, i) => (
            <React.Fragment key={`${wf.id}-step-${step.order}`}>
              <div
                className="flex items-center gap-1.5 bg-secondary border border-border rounded-md px-2 py-1"
                title={step.jobType}
              >
                <span className="w-4 h-4 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-primary leading-none">{step.order}</span>
                </span>
                <span className="text-xs text-foreground truncate max-w-28" title={step.label}>
                  {step.label}
                </span>
              </div>
              {i < wf.steps.length - 1 && (
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  className="text-muted-foreground flex-shrink-0"
                >
                  <path
                    d="M2 6h8M7 3l3 3-3 3"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border/50">
        <div>
          <p className="text-xs text-muted-foreground">Active Jobs</p>
          <p
            className={`font-mono-data text-sm font-semibold ${wf.activeJobs > 0 ? 'text-emerald-400' : 'text-muted-foreground'}`}
          >
            {wf.activeJobs}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Completed Today</p>
          <p className="font-mono-data text-sm font-semibold text-foreground">
            {wf.completedToday}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        {wf.triggerType === 'MANUAL' && wf.status === 'ACTIVE' && (
          <button
            onClick={() => onTrigger(wf.id)}
            className="btn-primary text-xs py-1.5 flex-1 justify-center"
          >
            <PlayIcon width={13} height={13} />
            Run Now
          </button>
        )}
        {wf.status !== 'ARCHIVED' && wf.status !== 'DRAFT' && (
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
        <span className="text-xs text-muted-foreground font-mono-data ml-auto">{wf.id}</span>
      </div>
    </div>
  );
}
