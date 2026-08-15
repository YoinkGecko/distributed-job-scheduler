'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { PRIORITY_VALUE } from '@/lib/mockData';
import type { Job, JobPriority } from '@/lib/mockData';
import { StatusBadge, PriorityBadge } from '@/components/ui/StatusBadge';
import { toast } from 'sonner';
import {
  ChevronRightIcon,
  ArrowPathIcon,
  ClipboardDocumentIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  CpuChipIcon,
  DocumentTextIcon,
  BoltIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

function formatTs(ts: string | null | undefined): string {
  if (!ts) return '—';

  try {
    const date = new Date(ts);
    if (isNaN(date.getTime())) return '—';

    return (
      date.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      }) + ' IST'
    );
  } catch {
    return '—';
  }
}

function timeDiff(a: string | null | undefined, b: string | null | undefined): string {
  if (!a || !b) return '—';
  const ms = new Date(b).getTime() - new Date(a).getTime();
  if (ms < 0) return '—';
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

function normalizeJob(rawJob: any): Job {
  let priorityString: JobPriority = 'NORMAL';

  if (typeof rawJob?.priority === 'number') {
    if (rawJob.priority <= 1) priorityString = 'LOW';
    else if (rawJob.priority <= 5) priorityString = 'NORMAL';
    else if (rawJob.priority <= 10) priorityString = 'HIGH';
    else priorityString = 'CRITICAL';
  } else {
    priorityString = (rawJob?.priority?.toUpperCase() as JobPriority) || 'NORMAL';
  }

  return {
    ...rawJob,
    priority: priorityString,
    retryCount: rawJob?.retryCount ?? 0,
    maxRetries: rawJob?.maxRetries ?? 3,
    payload: typeof rawJob?.payload === 'object' ? rawJob.payload : {},
  };
}

export default function JobDetailContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  const fetchJobDetail = useCallback(async () => {
    if (!id) {
      setError('No job ID provided');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`http://localhost:3000/jobs/${id}`);

      if (!res.ok) {
        throw new Error(`Failed to fetch job details (${res.status})`);
      }

      const data = await res.json();
      const rawJob = data.job || data;
      setJob(normalizeJob(rawJob));
    } catch (err: any) {
      console.error('Error loading job detail:', err);
      setError(err.message || 'Error loading job details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchJobDetail();
  }, [fetchJobDetail]);

  function copyPayload() {
    if (!job?.payload) return;
    navigator.clipboard.writeText(JSON.stringify(job.payload, null, 2)).then(() => {
      setCopied(true);
      toast.success('Payload copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    });
  }

  // async function handleRetry() {
  //   if (!job?.id) return;

  //   try {
  //     setIsRetrying(true);
  //     const res = await fetch(`http://localhost:3000/jobs/${job.id}/retry`, {
  //       method: 'POST',
  //       headers: { 'Content-Type': 'application/json' },
  //     });

  //     if (!res.ok) {
  //       throw new Error(`Retry failed (${res.status})`);
  //     }

  //     toast.success('Job re-queued', { description: `${job.id} scheduled for retry` });
  //     fetchJobDetail();
  //   } catch (err: any) {
  //     console.error('Retry error:', err);
  //     toast.error('Failed to retry job', { description: err.message });
  //   } finally {
  //     setIsRetrying(false);
  //   }
  // }

  if (loading) {
    return (
      <div className="p-12 text-center text-muted-foreground flex items-center justify-center gap-2">
        <span className="w-4 h-4 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
        Loading job details…
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="card p-8 text-center space-y-4 max-w-lg mx-auto mt-12">
        <ExclamationTriangleIcon width={32} height={32} className="text-amber-400 mx-auto" />
        <h2 className="text-lg font-semibold text-foreground">Job Not Found</h2>
        <p className="text-sm text-muted-foreground">
          {error || 'Could not find requested job detail'}
        </p>
        <Link href="/" className="btn-primary inline-flex justify-center">
          Back to Jobs List
        </Link>
      </div>
    );
  }

  const retryPct = job.maxRetries > 0 ? Math.round((job.retryCount / job.maxRetries) * 100) : 0;
  const retryColor =
    retryPct >= 100 ? 'bg-red-500' : retryPct >= 60 ? 'bg-amber-500' : 'bg-emerald-500';

  const heartbeatAgeMs = job.heartbeatAt ? Date.now() - new Date(job.heartbeatAt).getTime() : null;
  const heartbeatStale = heartbeatAgeMs !== null && heartbeatAgeMs > 60_000;

  const numericPriorityVal = PRIORITY_VALUE[job.priority as keyof typeof PRIORITY_VALUE] ?? '—';

  return (
    <div className="space-y-6 max-w-screen-2xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link href="/" className="hover:text-primary transition-colors">
          Jobs
        </Link>
        <ChevronRightIcon width={12} height={12} />
        <span className="font-mono-data text-foreground">{job.id}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-semibold text-foreground font-mono-data">{job.id}</h1>
            <StatusBadge status={job.status} />
            <PriorityBadge priority={job.priority} />
          </div>
          <p className="text-sm text-muted-foreground font-mono-data">{job.type}</p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/" className="btn-ghost text-sm">
            ← Back to Jobs
          </Link>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-3 gap-5">
        {/* Core Info */}
        <div className="lg:col-span-2 space-y-5">
          {/* Identity card */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <DocumentTextIcon width={16} height={16} className="text-primary" />
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                Core Information
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FieldRow label="Job ID" value={job.id} mono />
              <FieldRow label="Type" value={job.type} mono />
              <FieldRow label="Status" value={<StatusBadge status={job.status} />} />
              <FieldRow
                label="Priority"
                value={
                  <div className="flex items-center gap-2">
                    <PriorityBadge priority={job.priority} />
                    <span className="text-xs text-muted-foreground font-mono-data">
                      (numeric: {numericPriorityVal})
                    </span>
                  </div>
                }
              />
              <FieldRow
                label="Retry Count"
                value={
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono-data text-sm font-semibold text-foreground">
                        {job.retryCount}
                      </span>
                      <span className="text-muted-foreground text-xs">/</span>
                      <span className="font-mono-data text-sm text-muted-foreground">
                        {job.maxRetries}
                      </span>
                      <span className="text-xs text-muted-foreground">max retries</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all ${retryColor}`}
                        style={{ width: `${Math.min(retryPct, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {retryPct}% of retry budget used
                    </p>
                  </div>
                }
              />
              <FieldRow
                label="Last Error"
                value={
                  job.lastError ? (
                    <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <ExclamationTriangleIcon
                          width={14}
                          height={14}
                          className="text-red-400 mt-0.5 flex-shrink-0"
                        />
                        <p className="text-xs text-red-300 font-mono-data leading-relaxed">
                          {job.lastError}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">No errors</span>
                  )
                }
                fullWidth
              />
            </div>
          </div>

          {/* Payload */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BoltIcon width={16} height={16} className="text-primary" />
                <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                  Payload
                </h2>
              </div>
              <button onClick={copyPayload} className="btn-ghost text-xs py-1">
                {copied ? (
                  <>
                    <CheckCircleIcon width={13} height={13} className="text-primary" />
                    Copied
                  </>
                ) : (
                  <>
                    <ClipboardDocumentIcon width={13} height={13} />
                    Copy JSON
                  </>
                )}
              </button>
            </div>
            <div className="bg-muted rounded-lg p-4 overflow-x-auto scrollbar-thin">
              <pre className="json-viewer text-foreground">
                <JsonHighlight data={job.payload} />
              </pre>
            </div>
          </div>
        </div>

        {/* Right panel: Timing + Worker */}
        <div className="space-y-5">
          {/* Timing */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <ClockIcon width={16} height={16} className="text-primary" />
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                Timing
              </h2>
            </div>
            <div className="space-y-3">
              <TimingRow label="Scheduled At" value={formatTs(job.scheduledAt)} />
              <TimingRow label="Created At" value={formatTs(job.createdAt)} />
              <TimingRow label="Updated At" value={formatTs(job.updatedAt)} />
              <TimingRow
                label="Started At"
                value={formatTs(job.startedAt)}
                highlight={!!job.startedAt}
              />
              <TimingRow
                label="Completed At"
                value={formatTs(job.completedAt)}
                highlight={!!job.completedAt}
                positive
              />
              {job.startedAt && (
                <div className="pt-2 border-t border-border/50">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Duration</span>
                    <span className="font-mono-data text-xs font-semibold text-primary">
                      {timeDiff(job.startedAt, job.completedAt ?? new Date().toISOString())}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Worker State */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <CpuChipIcon width={16} height={16} className="text-primary" />
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                Worker State
              </h2>
            </div>
            <div className="space-y-3">
              <div>
                <span className="label-text mb-1">Assigned Worker</span>
                {job.assignedWorker ? (
                  <p className="font-mono-data text-sm text-foreground">{job.assignedWorker}</p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">Not yet assigned</p>
                )}
              </div>

              <div>
                <span className="label-text mb-1">Last Heartbeat</span>
                {job.heartbeatAt ? (
                  <div className="flex items-center gap-2">
                    <p
                      className={`font-mono-data text-xs ${heartbeatStale ? 'text-amber-400' : 'text-foreground'}`}
                    >
                      {formatTs(job.heartbeatAt)}
                    </p>
                    {heartbeatStale && (
                      <span className="text-xs bg-amber-500/10 border border-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full">
                        Stale
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">—</p>
                )}
              </div>

              <div>
                <span className="label-text mb-1">Lock Expires At</span>
                {job.lockExpiresAt ? (
                  <p className="font-mono-data text-xs text-foreground">
                    {formatTs(job.lockExpiresAt)}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">—</p>
                )}
              </div>

              {/* Worker health indicator */}
              {job.status === 'RUNNING' && (
                <div className="pt-2 border-t border-border/50">
                  <div className="flex items-center gap-2">
                    <span className="status-dot status-dot-running" />
                    <span className="text-xs text-emerald-400 font-medium">Worker active</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick nav */}
          <div className="card p-4">
            <p className="text-xs text-muted-foreground mb-3 font-medium uppercase tracking-wide">
              Related
            </p>
            <div className="space-y-2">
              <Link
                href="/"
                className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary transition-colors group"
              >
                <span className="text-xs text-muted-foreground group-hover:text-foreground">
                  All Jobs
                </span>
                <ChevronRightIcon width={12} height={12} className="text-muted-foreground" />
              </Link>
              <Link
                href="/workflows"
                className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary transition-colors group"
              >
                <span className="text-xs text-muted-foreground group-hover:text-foreground">
                  Workflows
                </span>
                <ChevronRightIcon width={12} height={12} className="text-muted-foreground" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FieldRow({
  label,
  value,
  mono = false,
  fullWidth = false,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  fullWidth?: boolean;
}) {
  return (
    <div className={fullWidth ? 'col-span-2' : ''}>
      <span className="label-text">{label}</span>
      {typeof value === 'string' ? (
        <p className={`text-sm text-foreground mt-0.5 ${mono ? 'font-mono-data' : ''}`}>{value}</p>
      ) : (
        <div className="mt-1">{value}</div>
      )}
    </div>
  );
}

function TimingRow({
  label,
  value,
  highlight = false,
  positive = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  positive?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="text-xs text-muted-foreground flex-shrink-0">{label}</span>
      <span
        className={`font-mono-data text-xs text-right ${
          value === '—'
            ? 'text-muted-foreground'
            : positive
              ? 'text-emerald-400'
              : highlight
                ? 'text-blue-400'
                : 'text-foreground'
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function JsonHighlight({ data }: { data: Record<string, unknown> }) {
  const str = JSON.stringify(data || {}, null, 2);
  const lines = str.split('\n');
  return (
    <>
      {lines.map((line, i) => {
        const keyMatch = line.match(/^(\s*)("[\w\s]+")\s*:/);
        const strMatch = line.match(/:\s*(".*")/);
        const numMatch = line.match(/:\s*(\d+(?:\.\d+)?)/);
        const boolMatch = line.match(/:\s*(true|false)/);

        return (
          <div key={`json-line-${i}`}>
            {keyMatch ? (
              <span>
                <span className="text-muted-foreground">{keyMatch[1]}</span>
                <span className="text-blue-400">{keyMatch[2]}</span>
                <span className="text-muted-foreground">: </span>
                {strMatch && <span className="text-emerald-400">{strMatch[1]}</span>}
                {numMatch && <span className="text-amber-400">{numMatch[1]}</span>}
                {boolMatch && <span className="text-primary">{boolMatch[1]}</span>}
                {!strMatch && !numMatch && !boolMatch && (
                  <span className="text-foreground">{line.slice(line.indexOf(':') + 1)}</span>
                )}
              </span>
            ) : (
              <span className="text-muted-foreground">{line}</span>
            )}
          </div>
        );
      })}
    </>
  );
}
