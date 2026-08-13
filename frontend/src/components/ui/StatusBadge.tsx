import React from 'react';

type JobStatus = 'WAITING' | 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'DEAD';
type JobPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';

const statusConfig: Record<JobStatus, { label: string; className: string; dotClass: string }> = {
  WAITING: {
    label: 'Waiting',
    className: 'bg-zinc-800 text-zinc-400 border-zinc-700',
    dotClass: 'bg-zinc-500',
  },
  PENDING: {
    label: 'Pending',
    className: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    dotClass: 'bg-blue-400',
  },
  RUNNING: {
    label: 'Running',
    className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    dotClass: 'status-dot-running bg-emerald-400',
  },
  COMPLETED: {
    label: 'Completed',
    className: 'bg-teal-500/10 text-teal-300 border-teal-500/20',
    dotClass: 'bg-teal-400',
  },
  FAILED: {
    label: 'Failed',
    className: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    dotClass: 'bg-amber-400',
  },
  DEAD: {
    label: 'Dead',
    className: 'bg-red-500/10 text-red-400 border-red-500/20',
    dotClass: 'bg-red-500',
  },
};

const priorityConfig: Record<JobPriority, { label: string; value: number; className: string }> = {
  LOW: {
    label: 'LOW',
    value: 1,
    className: 'bg-zinc-800 text-zinc-400 border-zinc-700',
  },
  NORMAL: {
    label: 'NORMAL',
    value: 5,
    className: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  },
  HIGH: {
    label: 'HIGH',
    value: 10,
    className: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  },
  CRITICAL: {
    label: 'CRITICAL',
    value: 100,
    className: 'bg-red-500/10 text-red-400 border-red-500/20',
  },
};

export function StatusBadge({ status }: { status: JobStatus }) {
  const config = statusConfig[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${config.className}`}
    >
      <span className={`status-dot ${config.dotClass}`} />
      {config.label}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: JobPriority }) {
  const config = priorityConfig[priority];
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold border tracking-wide ${config.className}`}
    >
      {config.label}
    </span>
  );
}

export { statusConfig, priorityConfig };
export type { JobStatus, JobPriority };