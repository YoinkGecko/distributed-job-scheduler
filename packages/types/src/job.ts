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

export enum JobType {
  EMAIL = "EMAIL",
  PDF = "PDF",
  IMAGE_PROCESSING = "IMAGE_PROCESSING",
}

export interface Job {
  id: string;
  type: JobType;
  payload: Record<string, unknown>;

  status: JobStatus;
  priority: JobPriority;

  scheduledAt: Date | null;

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