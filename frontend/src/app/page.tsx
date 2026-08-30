'use client';

import React, { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import JobsMetricsCards from './components/JobsMetricsCards';
import JobsTable from './components/JobsTable';
import type { Job, JobPriority } from '@/lib/mockData';

export default function JobsListPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string>('—');

  // Callback for JobsTable to update the "last updated" timestamp
  const handleDataFetched = () => {
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

        {/* KPI cards get the jobs array */}
        <JobsMetricsCards jobs={jobs} />

        {/* Jobs table – it now owns the data fetching */}
        <JobsTable 
          jobs={jobs} 
          setJobs={setJobs} 
          onDataFetched={handleDataFetched}  // <-- new prop
        />
      </div>
    </AppLayout>
  );
}