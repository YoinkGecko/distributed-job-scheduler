import { JobRepository } from "../repositories/job.repository.js";
import {
  CreateJobInput,
  JobStatus,
  JobPriority,
  Job,
} from "@scheduler/types";

export class JobService {
  constructor(private readonly repository: JobRepository) {}

  private maxRetries(priority: JobPriority) {
    switch (priority) {
      case JobPriority.CRITICAL:
        return 10;

      case JobPriority.HIGH:
        return 5;

      default:
        return 3;
    }
  }

  async createJob(input: CreateJobInput) {
    const priority = input.priority ?? JobPriority.NORMAL;
    const now = new Date();

    const job: Job = {
      id: crypto.randomUUID(),
      type: input.type,
      payload: input.payload,
      status: JobStatus.PENDING,
      priority: priority,
      scheduledAt: input.scheduledAt ?? now,
      createdAt: now,
      updatedAt: now,
      startedAt: null,
      completedAt: null,
      retryCount: 0,
      maxRetries: this.maxRetries(priority),
      assignedWorker: null,
      heartbeatAt: null,
      lockExpiresAt: null,
      lastError: null,
    };

    console.log("Creating Job", job.id);
    await this.repository.create(job);
  }
}
