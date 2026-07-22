import { JobRepository } from "../repositories/job.repository.js";
import { RedisPublisher } from "../publishers/redis.publisher.js";
import { CreateJobInput, JobStatus, JobPriority, Job } from "@scheduler/types";

export class JobService {
  constructor(
    private readonly repository: JobRepository,
    private readonly publisher: RedisPublisher,
  ) {}

  private RetryPolicy = {
    NORMAL: 3,
    HIGH: 5,
    CRITICAL: 10,
  };

  private maxRetries(priority: JobPriority) {
    switch (priority) {
      case JobPriority.CRITICAL:
        return this.RetryPolicy.CRITICAL;

      case JobPriority.HIGH:
        return this.RetryPolicy.HIGH;

      default:
        return this.RetryPolicy.NORMAL;
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

    console.log("\n\nCreating Job", job.id);
    const createdJob = await this.repository.create(job);
    await this.publisher.publish(createdJob.id);
    return createdJob;
  }
}
