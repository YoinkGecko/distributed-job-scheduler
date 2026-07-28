export enum WorkflowStatus {
  PENDING = "PENDING",
  RUNNING = "RUNNING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  CANCELLED = "CANCELLED",
}

export interface Workflow {
    id: string;
    name: string;
    status: WorkflowStatus;
    metadata: Record<string, unknown>;
    createdAt?: Date;
    updatedAt?: Date;
    startedAt?: Date;
    completedAt?: Date;
}

