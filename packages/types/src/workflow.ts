export enum ScheduleType {
  ONCE = "ONCE",
  INTERVAL = "INTERVAL",
  CRON = "CRON",
}

export enum WorkflowStatus {
  ACTIVE = "ACTIVE",
  PAUSED = "PAUSED",
  ARCHIVED = "ARCHIVED",
}

// Interface

export interface CreateWorkflowInput {
  name: string;
  description?: string;
  startAt?: Date | null;
  endAt?: Date | null;
  scheduleType: ScheduleType;
  scheduleExpression: string;
  metadata?: Record<string, unknown>;
}

export interface Workflow {
  id: string;
  name: string;
  description: string | null;
  status: WorkflowStatus;
  startAt: Date | null;
  endAt: Date | null;
  scheduleType: ScheduleType;
  scheduleExpression: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}
