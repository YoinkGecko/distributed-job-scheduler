import { Job, JobStatus } from "@scheduler/types";
import { pool } from "../../pool.js";

export class JobRepository {
  async create(job: Job): Promise<Job> {
    const insertJobQuery = `
      INSERT INTO jobs (
        id,
        type,
        payload,
        status,
        priority,
        scheduled_at,
        created_at,
        updated_at,
        started_at,
        completed_at,
        retry_count,
        max_retries,
        assigned_worker,
        heartbeat_at,
        lock_expires_at,
        last_error
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
      )
      RETURNING *;
    `;

    const values = [
      job.id,
      job.type,
      job.payload,
      job.status,
      job.priority,
      job.scheduledAt,
      job.createdAt,
      job.updatedAt,
      job.startedAt,
      job.completedAt,
      job.retryCount,
      job.maxRetries,
      job.assignedWorker,
      job.heartbeatAt,
      job.lockExpiresAt,
      job.lastError,
    ];

    const result = await pool.query(insertJobQuery, values);
    console.log("Job created");
    return result.rows[0];
  }

  async findById(id: string): Promise<Job | null> {
    const findJobQuery = `
      SELECT * FROM jobs
      WHERE id = $1;
    `;

    const result = await pool.query(findJobQuery, [id]);
    if (result.rows.length === 0) {
      return null;
    }
    return result.rows[0];
  }

  async updateStatus(id: string, status: JobStatus): Promise<void> {
    const updateJobStatusQuery = `
      UPDATE jobs
      SET status = $1
      WHERE id = $2;
    `;

    const result = await pool.query(updateJobStatusQuery, [id,status]);
  }
}
