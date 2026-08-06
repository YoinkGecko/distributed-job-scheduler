import { pool } from "../../pool.js";
import { WorkflowJobExecution, JobStatus } from "@scheduler/types";
import { snakeToCamel } from "../utility/snakeToCamel.js";
import { PoolClient } from "@scheduler/database";

export class WorkflowJobExecutionRepository {
  async create(
    workflowJobExecutions: WorkflowJobExecution[],
    client?: PoolClient,
  ): Promise<WorkflowJobExecution[]> {
    const executer = client || pool;
    const placeholders = workflowJobExecutions
      .map((_, index) => {
        const offset = index * 18;

        return `(
        $${offset + 1},
        $${offset + 2},
        $${offset + 3},
        $${offset + 4},
        $${offset + 5},
        $${offset + 6},
        $${offset + 7},
        $${offset + 8},
        $${offset + 9},
        $${offset + 10},
        $${offset + 11},
        $${offset + 12},
        $${offset + 13},
        $${offset + 14},
        $${offset + 15},
        $${offset + 16},
        $${offset + 17},
        $${offset + 18}
      )`;
      })
      .join(", ");

    const values = workflowJobExecutions.flatMap((execution) => [
      execution.id,
      execution.workflowExecutionId,
      execution.workflowJobId,
      execution.type,
      execution.payload,
      execution.status,
      execution.priority,
      execution.scheduledAt,
      execution.createdAt,
      execution.updatedAt,
      execution.startedAt,
      execution.completedAt,
      execution.retryCount,
      execution.maxRetries,
      execution.assignedWorker,
      execution.heartbeatAt,
      execution.lockExpiresAt,
      execution.lastError,
    ]);

    const createWorkflowJobExecutionQuery = `
    INSERT INTO workflow_job_executions (
      id,
      workflow_execution_id,
      workflow_job_id,
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
    )
    VALUES
    ${placeholders}
    RETURNING *;
  `;

    const result = await executer.query(
      createWorkflowJobExecutionQuery,
      values,
    );

    return result.rows.map((row) => snakeToCamel(row));
  }

  async findById(
    workflowJobExecutionId: string,
  ): Promise<WorkflowJobExecution | null> {
    const findWorkflowJobExecutionQuery = `
    SELECT *
    FROM workflow_job_executions
    WHERE id = $1;
  `;

    const result = await pool.query(findWorkflowJobExecutionQuery, [
      workflowJobExecutionId,
    ]);

    if (result.rows.length === 0) {
      return null;
    }

    return snakeToCamel(result.rows[0]);
  }

async updateStatus(
  workflowJobExecutionId: string,
  status: JobStatus,
): Promise<void> {
  const query = `
    UPDATE workflow_job_executions
    SET
      status = $1,
      updated_at = NOW(),
      completed_at = NOW()
    WHERE id = $2;
  `;

  await pool.query(query, [status, workflowJobExecutionId]);
}

  async updateStatusByWorkflowJobIds(
    workflowExecutionId: string,
    workflowJobIds: string[],
    status: JobStatus,
    client?: PoolClient,
  ): Promise<void> {
    const executor = client || pool;
    if (!workflowJobIds || workflowJobIds.length === 0) return;

    const query = `
    UPDATE workflow_job_executions
    SET
      status = $1,
      updated_at = NOW()
    WHERE workflow_execution_id = $2
    AND workflow_job_id = ANY($3);
  `;

    await executor.query(query, [status, workflowExecutionId, workflowJobIds]);
  }

  async findByWorkflowJobIds(
    workflowExecutionId: string,
    workflowJobIds: string[],
  ): Promise<WorkflowJobExecution[]> {
    if (!workflowJobIds || workflowJobIds.length === 0) return [];

    const query = `
    SELECT *
    FROM workflow_job_executions
    WHERE workflow_execution_id = $1
    AND workflow_job_id = ANY($2);
  `;

    const result = await pool.query(query, [
      workflowExecutionId,
      workflowJobIds,
    ]);

    return result.rows.map((row) => snakeToCamel(row));
  }

  async claimJob(
    workflowJobExecutionId: string,
    workerName: string,
  ): Promise<WorkflowJobExecution | null> {
    const claimJobQuery = `
    UPDATE workflow_job_executions
    SET
      status = 'RUNNING',
      assigned_worker = $2,
      heartbeat_at = NOW(),
      lock_expires_at = NOW() + INTERVAL '30 seconds',
      updated_at = NOW(),
      started_at = CASE
        WHEN started_at IS NULL
        THEN NOW()
        ELSE started_at
      END
    WHERE
      id = $1
      AND status = 'PENDING'
    RETURNING *;
  `;

    const result = await pool.query(claimJobQuery, [
      workflowJobExecutionId,
      workerName,
    ]);

    if (result.rows.length === 0) {
      return null;
    }

    return snakeToCamel(result.rows[0]);
  }

  async updateHeartbeat(workflowJobExecutionId: string): Promise<void> {
    const updateHeartbeatQuery = `
    UPDATE workflow_job_executions
    SET
      heartbeat_at = NOW(),
      lock_expires_at = NOW() + INTERVAL '30 seconds'
    WHERE id = $1;
  `;

    await pool.query(updateHeartbeatQuery, [workflowJobExecutionId]);
  }
}
