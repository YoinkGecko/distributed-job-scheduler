import { pool } from "../../pool.js";
import { PoolClient, snakeToCamel } from "@scheduler/database";
import { WorkflowJob } from "@scheduler/types";

export class WorkflowJobRepository {
  async createWorkflowJob(
    workflowJob: WorkflowJob,
    client: PoolClient,
  ): Promise<WorkflowJob> {
    const createWorkflowJobQuery = `
      INSERT INTO workflow_jobs (
        id,
        workflow_id,
        job_id,
        created_at
      )
      VALUES (
        $1, $2, $3, $4
      )
      RETURNING *;
    `;

    const values = [
      workflowJob.id,
      workflowJob.workflowId,
      workflowJob.jobId,
      workflowJob.createdAt,
    ];

    const result = await client.query(createWorkflowJobQuery, values);

    return snakeToCamel(result.rows[0]);
  }

  async findById(id: string): Promise<WorkflowJob | null> {
    const findByIdQuery = `
      SELECT *
      FROM workflow_jobs
      WHERE id = $1;
    `;

    const result = await pool.query(findByIdQuery, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return snakeToCamel(result.rows[0]);
  }

  async findByWorkflowId(workflowId: string): Promise<WorkflowJob[]> {
    const findByWorkflowIdQuery = `
      SELECT *
      FROM workflow_jobs
      WHERE workflow_id = $1;
    `;

    const result = await pool.query(findByWorkflowIdQuery, [workflowId]);

    return result.rows.map((row) => snakeToCamel(row));
  }

  async findByJobId(jobId: string): Promise<WorkflowJob[]> {
    const findByJobIdQuery = `
      SELECT *
      FROM workflow_jobs
      WHERE job_id = $1;
    `;

    const result = await pool.query(findByJobIdQuery, [jobId]);

    return result.rows.map((row) => snakeToCamel(row));
  }

  async findByWorkflowAndJob(
    workflowId: string,
    jobId: string,
  ): Promise<WorkflowJob | null> {
    const findByWorkflowAndJobQuery = `
      SELECT *
      FROM workflow_jobs
      WHERE workflow_id = $1
        AND job_id = $2;
    `;

    const result = await pool.query(findByWorkflowAndJobQuery, [
      workflowId,
      jobId,
    ]);

    if (result.rows.length === 0) {
      return null;
    }

    return snakeToCamel(result.rows[0]);
  }

  async deleteByWorkflowId(
    workflowId: string,
    client: PoolClient,
  ): Promise<void> {
    const deleteByWorkflowIdQuery = `
      DELETE FROM workflow_jobs
      WHERE workflow_id = $1;
    `;

    await client.query(deleteByWorkflowIdQuery, [workflowId]);
  }
}
