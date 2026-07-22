export enum JobStatus {
  PENDING = "PENDING",
  RUNNING = "RUNNING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  DEAD = "DEAD",
}

export enum JobPriority {
    LOW = 1,
    NORMAL = 5,
    HIGH = 10,
    CRITICAL = 100,
}

export interface Job {
  id: string;
  type: string;
  payload: Record<string, unknown>; //is TypeScript's safe way of saying "a flexible key-value object where keys are strings and values can be anything".
  status: JobStatus;
  priority: JobPriority;
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
