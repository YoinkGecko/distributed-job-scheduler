import React from 'react';
import AppLayout from '@/components/AppLayout';
import WorkflowsContent from './components/WorkflowsContent';

export default function WorkflowsPage() {
  return (
    <AppLayout activeRoute="/workflows">
      <WorkflowsContent />
    </AppLayout>
  );
}