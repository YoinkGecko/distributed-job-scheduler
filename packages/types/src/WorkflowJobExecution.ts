import {JobStatus} from "./job.js"

export interface WorkflowJobExecution {
  id: string;
  workflowExecutionId: string;
  workflowJobId: string;
  status: JobStatus;
  retryCount: number;
  lastError: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}