export enum WorkflowStatus {
  RUNNING = "RUNNING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  CANCELLED = "CANCELLED",
}

export enum DependencyPolicy {
  ALL = "ALL",
  ANY = "ANY",
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

export interface JobDependency {
    id: string;
    parentJobId: string;
    childJobId: string;
    createdAt: Date;
}