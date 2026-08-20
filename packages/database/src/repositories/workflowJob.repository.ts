import crypto from "crypto";
import { pool } from "../../pool.js";
import { PoolClient, snakeToCamel } from "@scheduler/database";
import { WorkflowJob } from "@scheduler/types";

export class WorkflowJobRepository {
  async isJobAttached(workflowId: string, jobIds: string[]) {
    const query = `
    SELECT job_id 
    FROM workflow_jobs 
    WHERE workflow_id = $1 AND job_id = ANY($2);
  `;
    const result = await pool.query(query, [workflowId, jobIds]);
    const attachedJobIds = result.rows.map((row) => row.job_id);
    return attachedJobIds;
  }

  async createWorkflowJobs(
    workflowId: string,
    jobIds: string[],
  ): Promise<WorkflowJob[]> {
    const now = new Date();
    const workflowJobs = jobIds.map((jobId) => ({
      id: crypto.randomUUID(),
      workflowId,
      jobId,
      createdAt: now,
    }));

    const placeholders = workflowJobs
      .map((_, index) => {
        const offset = index * 4;
        return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4})`;
      })
      .join(", ");

    const values = workflowJobs.flatMap((workflowJob) => [
      workflowJob.id,
      workflowJob.workflowId,
      workflowJob.jobId,
      workflowJob.createdAt,
    ]);

    const query = `
      INSERT INTO workflow_jobs (
        id,
        workflow_id,
        job_id,
        created_at
      )
      VALUES
      ${placeholders}
      RETURNING *;
    `;

    const result = await pool.query(query, values);
    return result.rows.map((row) => snakeToCamel(row));
  }

  async findByIds(workflowJobIds: string[]): Promise<WorkflowJob[]> {
    const query = `SELECT * FROM workflow_jobs WHERE id = ANY($1);`;
    const result = await pool.query(query, [workflowJobIds]);
    return snakeToCamel(result.rows);
  }

  async findByWorkflowId(workflowId: string,client?:PoolClient): Promise<WorkflowJob[]> {
    const executor = client || pool;
    const query = `
    SELECT *
    FROM workflow_jobs
    WHERE workflow_id = $1;
  `;

    const result = await executor.query(query, [workflowId]);

    return result.rows.map((row) => snakeToCamel(row));
  }

  async findRootWorkflowJobs(workflowId: string,client?:PoolClient): Promise<WorkflowJob[]> {
    const executor = client || pool;
    const query = `
    SELECT *
    FROM workflow_jobs wj
    WHERE wj.workflow_id = $1
    AND NOT EXISTS (
      SELECT 1
      FROM workflow_job_dependencies d
      WHERE d.child_workflow_job_id = wj.id
    );
  `;

    const result = await executor.query(query, [workflowId]);

    return result.rows.map((row) => snakeToCamel(row));
  }

  async getWorkflowJobs(workflowId: string){
    const query = `SELECT job_id FROM workflow_jobs WHERE workflow_id = $1;`;
    const result = await pool.query(query, [workflowId]);
    return snakeToCamel(result.rows);
  }
}
