import { PoolClient, pool } from "@scheduler/database";
import { Workflow, WorkflowStatus } from "@scheduler/types";
import { snakeToCamel } from "@scheduler/database";

export class WorkflowRepository {
  async createWorkflow(
    workflow: Workflow,
    client: PoolClient,
  ): Promise<Workflow> {
    const insertWorkflowQuery = `INSERT INTO workflows (
        id,
        name,
        status,
        metadata,
        created_at,
        updated_at
        )
        VALUES (
        $1,$2,$3,$4,$5,$6
        )
        RETURNING *;`;

    const values = [
      workflow.id,
      workflow.name,
      workflow.status,
      workflow.metadata,
      workflow.createdAt,
      workflow.updatedAt,
    ];

    const result = await client.query(insertWorkflowQuery, values);
    return snakeToCamel(result.rows[0]);
  }

  async findById(id: string): Promise<Workflow | null> {
    const findByIdQuery = `SELECT *
        FROM workflows
        WHERE id = $1;`;

    const result = await pool.query(findByIdQuery, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return snakeToCamel(result.rows[0]);
  }

  async updateStatus(id: string, status: WorkflowStatus): Promise<void> {
    const updateStatusQuery = `UPDATE workflows
        SET
            status = $2,
            updated_at = NOW()
        WHERE id = $1;`;

    await pool.query(updateStatusQuery, [id, status]);
  }
}
