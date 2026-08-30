'use client';

import React, { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';
import JobsMetricsCards from './components/JobsMetricsCards';
import JobsTable from './components/JobsTable';
import type { Job, JobPriority } from '@/lib/mockData';

interface Metrics {
  total: number;
  running: number;
  failed: number;
  dead: number;
  retrying: number;
}

export default function JobsListPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({
    total: 0,
    running: 0,
    failed: 0,
    dead: 0,
    retrying: 0,
  });
  const [lastUpdated, setLastUpdated] = useState<string>('—');
  const [loadingMetrics, setLoadingMetrics] = useState(true);

  const fetchMetrics = useCallback(async () => {
    try {
      setLoadingMetrics(true);
      const res = await fetch('http://localhost:3000/jobs/metrics');
      const data = await res.json();
      setMetrics(data);
    } catch (err) {
      console.error('Error fetching metrics:', err);
    } finally {
      setLoadingMetrics(false);
    }
  }, []);

  const updateTimestamp = () => {
    const now = new Date();
    setLastUpdated(
      now.toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      }) + ' IST'
    );
  };

  // Fetch metrics on mount
  useEffect(() => {
    fetchMetrics();
    updateTimestamp();
    // Optional: refresh metrics every 30 seconds
    const interval = setInterval(() => {
      fetchMetrics();
      updateTimestamp();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchMetrics]);

  // Callback when JobsTable completes a data fetch (for pagination/filter changes)
  const handleDataFetched = () => {
    updateTimestamp();
    // Optionally refresh metrics after a job action (delete/retry/add)
    fetchMetrics();
  };

  return (
    <AppLayout activeRoute="/">
      <div className="space-y-6 max-w-screen-2xl">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Jobs</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Monitor and manage all scheduled background jobs
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-muted-foreground bg-secondary border border-border px-2.5 py-1 rounded-md">
              Last updated: {lastUpdated}
            </span>
          </div>
        </div>

        {/* KPI cards – now receive metrics directly */}
        <JobsMetricsCards metrics={metrics} loading={loadingMetrics} />

        {/* Jobs table – now fully responsible for data fetching */}
        <JobsTable 
          jobs={jobs} 
          setJobs={setJobs} 
          onDataFetched={handleDataFetched}
        />
      </div>
    </AppLayout>
  );
}