import { JobPriority, JobType } from "./job.js";

export interface CreateJobInput {
  type: JobType;
  payload: Record<string, unknown>;
  priority?: JobPriority;
  scheduledAt?: Date;
}