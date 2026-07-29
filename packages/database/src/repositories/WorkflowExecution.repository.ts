import { pool } from "../../pool.js";
import { PoolClient, snakeToCamel } from "@scheduler/database";

import { WorkflowExecution, WorkflowExecutionStatus } from "@scheduler/types";

export class WorkflowExecutionRepository {
    
  async createExecution(
    execution: WorkflowExecution,
    client: PoolClient,
  ): Promise<WorkflowExecution> {
    const createExecutionQuery = `
      INSERT INTO workflow_executions (
        id,
        workflow_id,
        status,
        started_at,
        completed_at,
        created_at,
        updated_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7
      )
      RETURNING *;
    `;

    const values = [
      execution.id,
      execution.workflowId,
      execution.status,
      execution.startedAt,
      execution.completedAt,
      execution.createdAt,
      execution.updatedAt,
    ];

    const result = await client.query(createExecutionQuery, values);

    return snakeToCamel(result.rows[0]);
  }

  async findById(executionId: string): Promise<WorkflowExecution | null> {
    const findByIdQuery = `
      SELECT *
      FROM workflow_executions
      WHERE id = $1;
    `;

    const result = await pool.query(findByIdQuery, [executionId]);

    if (result.rows.length === 0) {
      return null;
    }

    return snakeToCamel(result.rows[0]);
  }

  async updateStatus(
    executionId: string,
    status: WorkflowExecutionStatus,
    client: PoolClient,
  ): Promise<WorkflowExecution> {
    const updateStatusQuery = `
      UPDATE workflow_executions
      SET
        status = $1,
        updated_at = NOW()
      WHERE id = $2
      RETURNING *;
    `;

    const result = await client.query(updateStatusQuery, [status, executionId]);

    return snakeToCamel(result.rows[0]);
  }

  async completeExecution(
    executionId: string,
    client: PoolClient,
  ): Promise<WorkflowExecution> {
    const completeExecutionQuery = `
      UPDATE workflow_executions
      SET
        status = 'COMPLETED',
        completed_at = NOW(),
        updated_at = NOW()
      WHERE id = $1
      RETURNING *;
    `;

    const result = await client.query(completeExecutionQuery, [executionId]);

    return snakeToCamel(result.rows[0]);
  }

  async findRunningExecutions(
    workflowId: string,
  ): Promise<WorkflowExecution[]> {
    const findRunningExecutionsQuery = `
      SELECT *
      FROM workflow_executions
      WHERE workflow_id = $1
        AND status = 'RUNNING';
    `;

    const result = await pool.query(findRunningExecutionsQuery, [workflowId]);

    return result.rows.map((row) => snakeToCamel(row));
  }
}
