import { JobRepository } from "@scheduler/database";
import { CreateJobInput, JobStatus, JobPriority, Job } from "@scheduler/types";
import { pool } from "@scheduler/database";

//import other services
import { OutboxService } from "./outbox.service.js";

export class JobService {
  constructor(
    private readonly jobRepository: JobRepository,
    private readonly outboxService: OutboxService,
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
    const client = await pool.connect();
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

      const outboxPayload = {
      jobId: job.id,
      type: job.type,
      priority: job.priority,
      scheduledAt : job.scheduledAt
      }

    console.log("\n\nCreating Job", job.id);

    try {
      await client.query("BEGIN");

      const createdJob = await this.jobRepository.createJob(job, client);
      await this.outboxService.createEvent(outboxPayload,client);

      await client.query("COMMIT");

      return createdJob;

    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

  }

  async getJobs(){
    const jobs = await this.jobRepository.getJobs();
    return jobs;
  }
}
