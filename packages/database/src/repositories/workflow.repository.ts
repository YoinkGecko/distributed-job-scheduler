import { PoolClient } from "@scheduler/database";
import { Workflow, WorkflowStatus } from "@scheduler/types";

export class WorkflowRepository {

  async create(workflow: Workflow, client: PoolClient): Promise<Workflow> {
    const createQuery = `INSERT INTO workflows (
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

    return workflow;
    
  }

  async findById(id: string): Promise<Workflow | null> {
    const findByIdQuery = `SELECT *
        FROM workflows
        WHERE id = $1;`;

        return null;
  }


  async updateStatus(id: string, status: WorkflowStatus): Promise<void> {
    const updateStatusQuery = `UPDATE workflows
        SET
            status = $2,
            updated_at = NOW()
        WHERE id = $1;`;
  }
}
