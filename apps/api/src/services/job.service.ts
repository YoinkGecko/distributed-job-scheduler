import { JobRepository } from "../repositories/job.repository.js";
import {
  CreateJobInput,
  JobStatus,
  JobPriority,
  JobType,
  Job,
} from "@scheduler/types";

export class JobService {

  constructor(private readonly repository: JobRepository) {}

  async createJob(input: CreateJobInput) {

    const job: Job = {
      id: crypto.randomUUID(),
      type: input.type,
      payload: input.payload,

      status: JobStatus.PENDING,
      priority: input.priority ?? JobPriority.NORMAL,

      scheduledAt: input.scheduledAt ?? new Date(),

      createdAt: new Date(),
      updatedAt: new Date(),
      startedAt: null,
      completedAt: null,

      retryCount: 0,
      maxRetries: 3,

      assignedWorker: null,
      heartbeatAt: null,
      lockExpiresAt: null,

      lastError: null,
    };

    console.log("Job Service reached");
    await this.repository.create();
    
  }
}
