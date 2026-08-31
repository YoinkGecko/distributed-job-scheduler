'use client';

import React, { useState, useEffect } from 'react';

interface Execution {
  id: string;
  workflowId: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ExecutionsTableProps {
  workflowId: string;
  onSelectExecution?: (executionId: string) => void;
  selectedExecutionId?: string | null;
}

export default function ExecutionsTable({
  workflowId,
  onSelectExecution,
  selectedExecutionId: externalSelectedId,
}: ExecutionsTableProps) {
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(null);

  const selectedId = externalSelectedId !== undefined ? externalSelectedId : internalSelectedId;

  useEffect(() => {
    const fetchExecutions = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`http://localhost:3000/workflow/${workflowId}/executions`);
        if (!res.ok) throw new Error(`Failed to fetch executions: ${res.statusText}`);
        const data = await res.json();
        setExecutions(data);
        // Auto-select first execution if any
        if (data.length > 0 && !selectedId) {
          const firstId = data[0].id;
          if (onSelectExecution) onSelectExecution(firstId);
          else setInternalSelectedId(firstId);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchExecutions();
  }, [workflowId]);

  const formatDate = (ts: string | null) => {
    if (!ts) return '—';
    try {
      return new Date(ts).toLocaleString('en-IN', {
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
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { bg: string; text: string; dot: string }> = {
      RUNNING: { bg: 'bg-blue-500/10', text: 'text-blue-400', dot: 'bg-blue-400' },
      COMPLETED: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-400' },
      FAILED: { bg: 'bg-rose-500/10', text: 'text-rose-400', dot: 'bg-rose-400' },
      WAITING: { bg: 'bg-amber-500/10', text: 'text-amber-400', dot: 'bg-amber-400' },
    };
    const c = config[status] || { bg: 'bg-zinc-800', text: 'text-zinc-500', dot: 'bg-zinc-500' };
    return (
      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${c.bg} ${c.text}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
        {status}
      </span>
    );
  };

  const handleRowClick = (execId: string) => {
    if (onSelectExecution) {
      onSelectExecution(execId);
    } else {
      setInternalSelectedId(execId);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="w-5 h-5 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
        <span className="ml-3 text-muted-foreground">Loading executions…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-6 text-center text-red-400">
        <p className="text-sm">Error loading executions: {error}</p>
      </div>
    );
  }

  if (executions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-muted-foreground">No executions found for this workflow.</p>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card/50 h-full">
      <div className="overflow-y-auto h-full">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-card border-b border-border">
            <tr>
              <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Execution</th>
              <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
              <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Started</th>
            </tr>
          </thead>
          <tbody>
            {executions.map((exec) => (
              <tr
                key={exec.id}
                onClick={() => handleRowClick(exec.id)}
                className={`cursor-pointer border-b border-border/40 transition-colors hover:bg-primary/5 ${
                  selectedId === exec.id ? 'bg-primary/10' : ''
                }`}
              >
                <td className="px-4 py-2.5 font-mono text-xs">{exec.id.slice(0, 8)}…</td>
                <td className="px-4 py-2.5">{getStatusBadge(exec.status)}</td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground">{formatDate(exec.startedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}