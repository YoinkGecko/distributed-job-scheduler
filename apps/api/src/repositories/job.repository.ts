import { Job } from "@scheduler/types";
import { pool } from "../db/pool.js";

export class JobRepository {
    
  async create(job: Job){
    const query = `
      INSERT INTO jobs (
        id,
        type,
        payload,
        status,
        priority,
        scheduledat,
        createdat,
        updatedat,
        startedat,
        completedat,
        retrycount,
        maxretries,
        assignedworker,
        heartbeatat,
        lockexpiresat,
        lasterror
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
      )
      RETURNING *;
    `;

    const values = [
      job.id,
      job.type,
      JSON.stringify(job.payload), // Convert object/record to JSON string for jsonb column
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

    const result = await pool.query(query, values);
    return result.rows[0];
  }
}