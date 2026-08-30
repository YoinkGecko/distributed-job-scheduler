import { JobRepository } from "@scheduler/database";
import { CreateJobInput, JobStatus, JobPriority, Job } from "@scheduler/types";
import { pool } from "@scheduler/database";
import { snakeToCamel } from "@scheduler/database";

//import other services
import { OutboxService } from "./outbox.service.js";

export class JobService {
  constructor(
    private readonly jobRepository: JobRepository,
    private readonly outboxService: OutboxService,
  ) {}

  private RetryPolicy = {
    LOW: 2,
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
      scheduledAt: job.scheduledAt,
    };

    console.log("\n\nCreating Job", job.id);

    try {
      await client.query("BEGIN");

      const createdJob = await this.jobRepository.createJob(job, client);
      await this.outboxService.createEvent(outboxPayload, client);

      await client.query("COMMIT");

      return createdJob;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async getJobs(options: GetJobsOptions) {
    const { page, limit, search, status, priority, sort, order } = options;
    const offset = (page - 1) * limit;

    // Map frontend sort field to database column name
    const sortMap: Record<string, string> = {
      id: "id",
      type: "type",
      status: "status",
      priority: "priority",
      scheduledAt: "scheduled_at",
      maxRetries: "max_retries",
      assignedWorker: "assigned_worker",
    };
    const sortColumn = sortMap[sort] || "scheduled_at";
    const sortDir = order.toUpperCase() === "ASC" ? "ASC" : "DESC";

    // Build WHERE clauses
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    // Search (case-insensitive)
    if (search) {
      conditions.push(
        `(id::text ILIKE $${paramIndex} OR type ILIKE $${paramIndex} OR assigned_worker ILIKE $${paramIndex})`,
      );
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Status filter (using PostgreSQL ANY)
    if (status.length > 0) {
      conditions.push(`status = ANY($${paramIndex})`);
      params.push(status);
      paramIndex++;
    }

    // Priority filter – map string to numeric range
    if (priority.length > 0) {
      const priorityRanges: string[] = [];
      for (const p of priority) {
        switch (p.toUpperCase()) {
          case "LOW":
            priorityRanges.push("priority <= 10");
            break;
          case "NORMAL":
            priorityRanges.push("priority BETWEEN 11 AND 40");
            break;
          case "HIGH":
            priorityRanges.push("priority BETWEEN 41 AND 70");
            break;
          case "CRITICAL":
            priorityRanges.push("priority > 70");
            break;
          default:
            break;
        }
      }
      if (priorityRanges.length > 0) {
        conditions.push(`(${priorityRanges.join(" OR ")})`);
      }
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Query for the paginated data
    const dataQuery = `
    SELECT *
    FROM jobs
    ${whereClause}
    ORDER BY ${sortColumn} ${sortDir}
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;
    const dataParams = [...params, limit, offset];

    // Query for total count (without pagination)
    const countQuery = `
    SELECT COUNT(*) as total
    FROM jobs
    ${whereClause}
  `;
    // Count query only needs the WHERE parameters (exclude limit & offset)
    const countParams = params.slice(0, params.length); // all params except the last two

    // Execute both queries in parallel
    const [dataResult, countResult] = await Promise.all([
      pool.query(dataQuery, dataParams),
      pool.query(countQuery, countParams),
    ]);

    const jobs = snakeToCamel(dataResult.rows);
    const total = parseInt(countResult.rows[0].total, 10);

    return { jobs, total };
  }

  async getJob(jobId: string) {
    if (!jobId) return false;
    const jobs = await this.jobRepository.findById(jobId);
    return jobs;
  }

  // services/jobService.ts
  async getJobMetrics() {
    const queries = `
    SELECT 
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE status = 'RUNNING') AS running,
      COUNT(*) FILTER (WHERE status = 'FAILED') AS failed,
      COUNT(*) FILTER (WHERE status = 'DEAD') AS dead,
      COUNT(*) FILTER (WHERE retry_count > 0) AS retrying
    FROM jobs;
  `;
    const result = await pool.query(queries);
    const row = result.rows[0];
    return {
      total: parseInt(row.total, 10),
      running: parseInt(row.running, 10),
      failed: parseInt(row.failed, 10),
      dead: parseInt(row.dead, 10),
      retrying: parseInt(row.retrying, 10),
    };
  }
}

interface GetJobsOptions {
  page: number;
  limit: number;
  search: string;
  status: string[];
  priority: string[];
  sort: string;
  order: string;
}
