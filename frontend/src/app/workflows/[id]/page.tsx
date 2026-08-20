'use client';

import { useParams } from 'next/navigation';
import WorkflowDetailPage from '../components/WorkflowDetailPage';

export default function WorkflowDetailRoute() {
  const params = useParams();
  const workflowId = params.id as string;

  return <WorkflowDetailPage workflowId={workflowId} />;
}