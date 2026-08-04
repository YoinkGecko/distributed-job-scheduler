import { pool } from "../../pool.js";
import {WorkflowExecution,WorkflowExecutionStatus} from "@scheduler/types"
import {snakeToCamel} from "../utility/snakeToCamel.js";
import {PoolClient} from "@scheduler/database";


export class WorkflowExecutionRepository {
  
  async create(workflowExecution: WorkflowExecution,client?:PoolClient): Promise<WorkflowExecution> {
    const executor = client || pool;
    const createWorkflowExecutionQuery = `
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
      workflowExecution.id,
      workflowExecution.workflowId,
      workflowExecution.status,
      workflowExecution.startedAt,
      workflowExecution.completedAt,
      workflowExecution.createdAt,
      workflowExecution.updatedAt,
    ];

    const result = await executor.query(
      createWorkflowExecutionQuery,
      values,
    );

    console.log("Workflow Execution created.");

    return snakeToCamel(result.rows[0]);
  }

  async findById(workflowExecutionId: string,): Promise<WorkflowExecution | null> {
  const findWorkflowExecutionQuery = `
    SELECT *
    FROM workflow_executions
    WHERE id = $1;
  `;

  const result = await pool.query(
    findWorkflowExecutionQuery,
    [workflowExecutionId],
  );

  if (result.rows.length === 0) {
    return null;
  }

  return snakeToCamel(result.rows[0]);
  }

  async updateStatus(workflowExecutionId: string,status: WorkflowExecutionStatus,): Promise<void> {
  const updateStatusQuery = `
    UPDATE workflow_executions
    SET
      status = $1,
      updated_at = NOW(),
      completed_at = CASE
        WHEN $1 IN ('COMPLETED', 'FAILED', 'CANCELLED')
        THEN NOW()
        ELSE completed_at
      END
    WHERE id = $2;
  `;

  await pool.query(updateStatusQuery, [
    status,
    workflowExecutionId,
  ]);
}
}