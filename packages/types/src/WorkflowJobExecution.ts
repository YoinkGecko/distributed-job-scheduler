import { JobStatus } from "./job.js"; 

export interface WorkflowJobExecution {
  id: string;

  workflowExecutionId: string;
  workflowJobId: string;

  type: string;
  payload: Record<string, unknown>;

  status: JobStatus;

  priority: number;

  scheduledAt: Date;

  createdAt: Date;
  updatedAt: Date;

  startedAt: Date | null;
  completedAt: Date | null;

  retryCount: number;
  maxRetries: number;

  assignedWorker: string | null;

  heartbeatAt: Date | null;
  lockExpiresAt: Date | null;

  lastError: string | null;
}