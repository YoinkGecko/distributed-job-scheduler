import React, { Suspense } from 'react';
import AppLayout from '@/components/AppLayout';
import JobDetailContent from './components/JobDetailContent';

export default function JobDetailPage() {
  return (
    <AppLayout activeRoute="/job-detail">
      <Suspense fallback={<div className="p-8 text-muted-foreground">Loading job details…</div>}>
        <JobDetailContent />
      </Suspense>
    </AppLayout>
  );
}