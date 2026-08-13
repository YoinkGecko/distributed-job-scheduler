import React from 'react';
import AppLayout from '@/components/AppLayout';
import JobsMetricsCards from './components/JobsMetricsCards';
import JobsTable from './components/JobsTable';

export default function JobsListPage() {
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
              Last updated: 15:52:21 UTC
            </span>
          </div>
        </div>

        {/* KPI cards */}
        <JobsMetricsCards />

        {/* Jobs table + Add new job */}
        <JobsTable />
      </div>
    </AppLayout>
  );
}