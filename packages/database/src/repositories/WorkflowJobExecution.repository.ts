import { pool } from "../../pool.js";
import { PoolClient, snakeToCamel } from "@scheduler/database";

import { JobStatus, WorkflowJobExecution } from "@scheduler/types";

export class WorkflowJobExecutionRepository {
  async createExecution(
    execution: WorkflowJobExecution,
    client: PoolClient,
  ): Promise<WorkflowJobExecution> {
    const createExecutionQuery = `
      INSERT INTO workflow_job_executions (
        id,
        workflow_execution_id,
        workflow_job_id,
        status,
        retry_count,
        last_error,
        started_at,
        completed_at,
        created_at,
        updated_at
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10
      )
      RETURNING *;
    `;

    const values = [
      execution.id,
      execution.workflowExecutionId,
      execution.workflowJobId,
      execution.status,
      execution.retryCount,
      execution.lastError,
      execution.startedAt,
      execution.completedAt,
      execution.createdAt,
      execution.updatedAt,
    ];

    const result = await client.query(createExecutionQuery, values);

    return snakeToCamel(result.rows[0]);
  }

  async findById(executionId: string): Promise<WorkflowJobExecution | null> {
    const findByIdQuery = `
      SELECT *
      FROM workflow_job_executions
      WHERE id = $1;
    `;

    const result = await pool.query(findByIdQuery, [executionId]);

    if (result.rows.length === 0) {
      return null;
    }

    return snakeToCamel(result.rows[0]);
  }

  async findByExecutionId(
    workflowExecutionId: string,
  ): Promise<WorkflowJobExecution[]> {
    const query = `
      SELECT *
      FROM workflow_job_executions
      WHERE workflow_execution_id = $1;
    `;

    const result = await pool.query(query, [workflowExecutionId]);

    return result.rows.map((row) => snakeToCamel(row));
  }

  async findByWorkflowJobId(
    workflowJobId: string,
  ): Promise<WorkflowJobExecution[]> {
    const query = `
      SELECT *
      FROM workflow_job_executions
      WHERE workflow_job_id = $1;
    `;

    const result = await pool.query(query, [workflowJobId]);

    return result.rows.map((row) => snakeToCamel(row));
  }

  async findByExecutionAndWorkflowJob(
    workflowExecutionId: string,
    workflowJobId: string,
  ): Promise<WorkflowJobExecution | null> {
    const query = `
      SELECT *
      FROM workflow_job_executions
      WHERE workflow_execution_id = $1
      AND workflow_job_id = $2;
    `;

    const result = await pool.query(query, [
      workflowExecutionId,
      workflowJobId,
    ]);

    if (result.rows.length === 0) {
      return null;
    }

    return snakeToCamel(result.rows[0]);
  }

  async updateStatus(
    executionId: string,
    status: JobStatus,
    client: PoolClient,
  ): Promise<WorkflowJobExecution> {
    const query = `
      UPDATE workflow_job_executions
      SET
        status = $1,
        updated_at = NOW()
      WHERE id = $2
      RETURNING *;
    `;

    const result = await client.query(query, [status, executionId]);

    return snakeToCamel(result.rows[0]);
  }

  async completeExecution(
    executionId: string,
    client: PoolClient,
  ): Promise<WorkflowJobExecution> {
    const query = `
      UPDATE workflow_job_executions
      SET
        status = 'COMPLETED',
        completed_at = NOW(),
        updated_at = NOW()
      WHERE id = $1
      RETURNING *;
    `;

    const result = await client.query(query, [executionId]);

    return snakeToCamel(result.rows[0]);
  }

  async incrementRetry(
    executionId: string,
    client: PoolClient,
  ): Promise<WorkflowJobExecution> {
    const query = `
      UPDATE workflow_job_executions
      SET
        retry_count = retry_count + 1,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *;
    `;

    const result = await client.query(query, [executionId]);

    return snakeToCamel(result.rows[0]);
  }

  async updateLastError(
    executionId: string,
    error: string,
    client: PoolClient,
  ): Promise<WorkflowJobExecution> {
    const query = `
      UPDATE workflow_job_executions
      SET
        last_error = $1,
        updated_at = NOW()
      WHERE id = $2
      RETURNING *;
    `;

    const result = await client.query(query, [error, executionId]);

    return snakeToCamel(result.rows[0]);
  }
}
