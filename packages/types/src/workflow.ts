export enum ScheduleType {
  ONCE = 'ONCE',
  INTERVAL = 'INTERVAL',
  CRON = 'CRON',
}

export enum WorkflowStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  ARCHIVED = 'ARCHIVED',
}

// Interface
export interface Workflow {
  id: string;
  name: string;
  description?: string | null;
  status: WorkflowStatus;
  startAt?: Date | null;
  endAt?: Date | null;
  scheduleType: ScheduleType;
  scheduleExpression: string;
  timezone: string;
  metadata: Record<string, any>; // Mapped from JSONB
  createdAt: Date;
  updatedAt: Date;
}