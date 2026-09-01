'use client';
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { Job, JobPriority } from '@/lib/mockData';
import { StatusBadge, PriorityBadge } from '@/components/ui/StatusBadge';
import type { JobStatus } from '@/components/ui/StatusBadge';
import AddJobForm from './AddJobForm';
import {
  MagnifyingGlassIcon,
  ChevronUpDownIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  EyeIcon,
  TrashIcon,
  ArrowPathIcon,
  PlusIcon,
  FunnelIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

type SortField =
  | 'id'
  | 'type'
  | 'status'
  | 'priority'
  | 'scheduledAt'
  | 'maxRetries'
  | 'assignedWorker';
type SortDir = 'asc' | 'desc';

const STATUS_FILTERS: JobStatus[] = [
  'WAITING',
  'PENDING',
  'RUNNING',
  'COMPLETED',
  'FAILED',
  'DEAD',
];
const PRIORITY_FILTERS: JobPriority[] = ['LOW', 'NORMAL', 'HIGH', 'CRITICAL'];
const PAGE_SIZE_OPTIONS = [10, 25, 50];

interface JobsTableProps {
  jobs: Job[];
  setJobs: React.Dispatch<React.SetStateAction<Job[]>>;
  onDataFetched?: () => void;  // optional callback
}

function formatTs(ts: string | null | undefined): string {
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

export default function JobsTable({ jobs, setJobs, onDataFetched}: JobsTableProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<JobStatus[]>([]);
  const [priorityFilter, setPriorityFilter] = useState<JobPriority[]>([]);
  const [sortField, setSortField] = useState<SortField>('scheduledAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showAddForm, setShowAddForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch jobs from server with pagination, filters, sorting
  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(pageSize));
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (statusFilter.length) params.set('status', statusFilter.join(','));
      if (priorityFilter.length) params.set('priority', priorityFilter.join(','));
      params.set('sort', sortField);
      params.set('order', sortDir);

      const res = await fetch(`http://localhost:3000/jobs?${params.toString()}`);
      const data = await res.json();

      // Transform priority values to strings if needed
      const formattedJobs = (data.jobs || []).map((job: any) => {
        let priorityString: JobPriority = 'NORMAL';
        const priorityValue =
          typeof job.priority === 'string' ? parseInt(job.priority, 10) : job.priority;
        if (typeof priorityValue === 'number' && !isNaN(priorityValue)) {
          if (priorityValue <= 10) priorityString = 'LOW';
          else if (priorityValue <= 40) priorityString = 'NORMAL';
          else if (priorityValue <= 70) priorityString = 'HIGH';
          else priorityString = 'CRITICAL';
        } else {
          priorityString = job.priority || 'NORMAL';
        }
        return { ...job, priority: priorityString };
      });

      setJobs(formattedJobs);
      setTotalCount(data.total || formattedJobs.length);
      if (onDataFetched) onDataFetched();
    } catch (err) {
      console.error('Error fetching jobs:', err);
      toast.error('Failed to load jobs');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, debouncedSearch, statusFilter, priorityFilter, sortField, sortDir, setJobs]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // When filters change, reset to page 1
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, priorityFilter, sortField, sortDir, pageSize]);

  // Compute total pages from totalCount
  const totalPages = Math.ceil(totalCount / pageSize);

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  }

  function toggleStatusFilter(s: JobStatus) {
    setStatusFilter((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  }

  function togglePriorityFilter(p: JobPriority) {
    setPriorityFilter((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  }

  function toggleSelectAll() {
    if (selected.size === jobs.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(jobs.map((j) => j.id)));
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleDelete(id: string) {
    setDeletingId(id);
    setTimeout(() => {
      // Optimistic update: remove from local list, then refetch to sync
      setJobs((prev) => prev.filter((j) => j.id !== id));
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setDeletingId(null);
      toast.success('Job deleted', { description: `Job ${id} removed from queue` });
      // Optionally refetch to update counts
      fetchJobs();
    }, 250);
  }

  function handleBulkDelete() {
    const count = selected.size;
    setJobs((prev) => prev.filter((j) => !selected.has(j.id)));
    setSelected(new Set());
    toast.success(`${count} job${count > 1 ? 's' : ''} deleted`);
    fetchJobs(); // refresh
  }

  function handleRetry(id: string) {
    // Optimistic update; you might also call an API to retry
    setJobs((prev) =>
      prev.map((j) =>
        j.id === id
          ? { ...j, status: 'PENDING' as JobStatus, retryCount: j.retryCount + 1, lastError: null }
          : j
      )
    );
    toast.success('Job re-queued', { description: `${id} scheduled for retry` });
    fetchJobs(); // refresh after a moment
  }

  function handleAddJob(job: Job) {
    // Add locally and refetch
    setJobs((prev) => [job, ...prev]);
    setShowAddForm(false);
    toast.success('Job created', { description: `${job.type} added to queue` });
    fetchJobs();
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field)
      return <ChevronUpDownIcon width={14} height={14} className="text-muted-foreground" />;
    return sortDir === 'asc' ? (
      <ChevronUpIcon width={14} height={14} className="text-primary" />
    ) : (
      <ChevronDownIcon width={14} height={14} className="text-primary" />
    );
  }

  const columns: { key: SortField; label: string; width: string }[] = [
    { key: 'id', label: 'Job ID', width: 'w-28' },
    { key: 'type', label: 'Type', width: 'w-40' },
    { key: 'status', label: 'Status', width: 'w-36' },
    { key: 'priority', label: 'Priority', width: 'w-32' },
    { key: 'scheduledAt', label: 'Scheduled At', width: 'w-48' },
    { key: 'maxRetries', label: 'Max Retries', width: 'w-28' },
    { key: 'assignedWorker', label: 'Worker', width: 'w-36' },
  ];

  return (
    <div className="space-y-4">
      {/* Filters row - same as before */}
      <div className="card p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-48">
            <MagnifyingGlassIcon
              width={16}
              height={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="text"
              placeholder="Search by ID, type, or worker…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                // page reset will happen in the useEffect that depends on debouncedSearch
              }}
              className="input-field pl-9"
            />
          </div>

          <div className="flex items-center gap-2">
            <FunnelIcon width={14} height={14} className="text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-medium">Status:</span>
            {STATUS_FILTERS.map((s) => (
              <button
                key={`status-filter-${s}`}
                onClick={() => toggleStatusFilter(s)}
                className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-all duration-150 ${
                  statusFilter.includes(s)
                    ? 'bg-primary/10 text-primary border-primary/30'
                    : 'bg-secondary text-muted-foreground border-border hover:border-primary/20 hover:text-foreground'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium">Priority:</span>
          {PRIORITY_FILTERS.map((p) => (
            <button
              key={`priority-filter-${p}`}
              onClick={() => togglePriorityFilter(p)}
              className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-all duration-150 ${
                priorityFilter.includes(p)
                  ? 'bg-primary/10 text-primary border-primary/30'
                  : 'bg-secondary text-muted-foreground border-border hover:border-primary/20 hover:text-foreground'
              }`}
            >
              {p}
            </button>
          ))}
          {(statusFilter.length > 0 || priorityFilter.length > 0 || search) && (
            <button
              onClick={() => {
                setStatusFilter([]);
                setPriorityFilter([]);
                setSearch('');
                setDebouncedSearch('');
                setPage(1);
              }}
              className="text-xs px-2.5 py-1 rounded-full border border-red-500/20 text-red-400 hover:bg-red-500/10 flex items-center gap-1 transition-all"
            >
              <XMarkIcon width={12} height={12} /> Clear all
            </button>
          )}
          <span className="ml-auto text-xs text-muted-foreground">
            {loading ? 'Loading...' : `${totalCount} total jobs`}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={jobs.length > 0 && selected.size === jobs.length}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-border bg-input accent-primary cursor-pointer"
                  />
                </th>
                {columns.map((col) => (
                  <th key={`col-${col.key}`} className={`${col.width} px-3 py-3 text-left`}>
                    <button
                      onClick={() => handleSort(col.key)}
                      className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide hover:text-foreground transition-colors"
                    >
                      {col.label}
                      <SortIcon field={col.key} />
                    </button>
                  </th>
                ))}
                <th className="w-24 px-3 py-3 text-right">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Actions
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center">
                    <div className="flex justify-center items-center gap-2">
                      <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm text-muted-foreground">Loading jobs…</span>
                    </div>
                  </td>
                </tr>
              ) : jobs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <BriefcaseEmptyIcon />
                      <p className="text-sm font-medium text-foreground">No jobs found</p>
                      <p className="text-xs text-muted-foreground max-w-xs">
                        No jobs match your current filters. Try adjusting the status or priority
                        filters, or clear your search.
                      </p>
                      <button
                        onClick={() => {
                          setStatusFilter([]);
                          setPriorityFilter([]);
                          setSearch('');
                          setDebouncedSearch('');
                        }}
                        className="btn-secondary text-xs"
                      >
                        Clear filters
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                jobs.map((job, index) => (
                  <tr
                    key={job.id || index}
                    className={`border-b border-border/50 transition-all duration-200 hover:bg-secondary/40 ${
                      deletingId === job.id ? 'row-delete-exit' : ''
                    } ${selected.has(job.id) ? 'bg-primary/5' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(job.id)}
                        onChange={() => toggleSelect(job.id)}
                        className="w-4 h-4 rounded border-border bg-input accent-primary cursor-pointer"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <span className="font-mono-data text-xs text-primary/80 font-medium">
                        {job?.id?.split('-')[0]}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className="text-xs text-foreground font-mono-data truncate block max-w-52"
                        title={job.type}
                      >
                        {job.type}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge status={job.status} />
                    </td>
                    <td className="px-3 py-3">
                      <PriorityBadge priority={job.priority} />
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className="font-mono-data text-xs text-muted-foreground">
                        {formatTs(job.scheduledAt)}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono-data text-xs text-foreground">
                          {job.retryCount}
                        </span>
                        <span className="text-muted-foreground text-xs">/</span>
                        <span className="font-mono-data text-xs text-muted-foreground">
                          {job.maxRetries}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      {job.assignedWorker ? (
                        <span
                          className="text-xs text-foreground font-mono-data truncate block max-w-36"
                          title={job.assignedWorker}
                        >
                          {job.assignedWorker}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">unassigned</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/job-detail?id=${job.id}`}
                          title="View job details"
                          className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
                        >
                          <EyeIcon width={15} height={15} />
                        </Link>
                        {(job.status === 'FAILED' || job.status === 'DEAD') && (
                          <button
                            onClick={() => handleRetry(job.id)}
                            title="Retry job"
                            className="p-1.5 rounded-md text-muted-foreground hover:text-amber-400 hover:bg-amber-500/10 transition-all"
                          >
                            <ArrowPathIcon width={15} height={15} />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(job.id)}
                          title="Delete job"
                          className="p-1.5 rounded-md text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-all"
                        >
                          <TrashIcon width={15} height={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="bg-secondary border border-border rounded-md text-xs text-foreground px-2 py-1 focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={`page-size-${n}`} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <span className="text-xs text-muted-foreground">
              {totalCount === 0
                ? '0–0 of 0'
                : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, totalCount)} of ${totalCount}`}
            </span>
          </div>

          <div className="flex items-center gap-1">
            {totalPages > 1 &&
              Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((n) => (
                <button
                  key={`page-${n}`}
                  onClick={() => setPage(n)}
                  className={`w-7 h-7 rounded-md text-xs font-medium transition-all ${
                    page === n
                      ? 'bg-primary/10 text-primary border border-primary/30'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                  }`}
                >
                  {n}
                </button>
              ))}
          </div>
        </div>
      </div>

      {/* Bulk action bar - unchanged */}
      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 slide-up">
          <div className="flex items-center gap-3 bg-card border border-border rounded-xl px-5 py-3 shadow-2xl shadow-black/60">
            <span className="text-sm font-medium text-foreground">
              {selected.size} job{selected.size > 1 ? 's' : ''} selected
            </span>
            <div className="w-px h-5 bg-border" />
            <button onClick={handleBulkDelete} className="btn-danger text-xs">
              <TrashIcon width={14} height={14} />
              Delete selected
            </button>
            <button onClick={() => setSelected(new Set())} className="btn-ghost text-xs">
              <XMarkIcon width={14} height={14} />
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Add New Job button */}
      <div className="flex items-center justify-between">
        <button onClick={() => setShowAddForm((p) => !p)} className="btn-primary">
          <PlusIcon width={16} height={16} />
          {showAddForm ? 'Cancel' : 'Add New Job'}
        </button>
        {showAddForm && (
          <span className="text-xs text-muted-foreground">
            Fill in the details below to schedule a new job
          </span>
        )}
      </div>

      {/* Add Job Form */}
      {showAddForm && (
        <div className="fade-in">
          <AddJobForm
            onAdd={handleAddJob}
            onCancel={() => setShowAddForm(false)}
            existingCount={totalCount}
          />
        </div>
      )}
    </div>
  );
}

function BriefcaseEmptyIcon() {
  return (
    <div className="w-12 h-12 rounded-xl bg-secondary border border-border flex items-center justify-center">
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="text-muted-foreground"
      >
        <rect x="2" y="7" width="20" height="14" rx="2" />
        <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
        <line x1="12" y1="12" x2="12" y2="16" />
        <line x1="10" y1="14" x2="14" y2="14" />
      </svg>
    </div>
  );
}