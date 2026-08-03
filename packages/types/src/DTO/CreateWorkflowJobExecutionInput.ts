export interface CreateWorkflowJobExecutionInput {
  workflowExecutionId: string;

  workflowJobId: string;

  type: string;
  payload: Record<string, unknown>;

  priority: number;
  maxRetries: number;

  scheduledAt: Date;
}