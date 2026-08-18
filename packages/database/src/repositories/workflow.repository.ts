import { pool } from "../../pool.js";
import { Workflow } from "@scheduler/types";
import { snakeToCamel,PoolClient } from "@scheduler/database";

export class WorkflowRepository {
  async create(workflow: Workflow): Promise<Workflow> {
    const query = `
      INSERT INTO workflows (
        id,
        name,
        description,
        status,
        start_at,
        end_at,
        schedule_type,
        schedule_expression,
        metadata,
        created_at,
        updated_at
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11
      )
      RETURNING *;
    `;

    const values = [
      workflow.id,
      workflow.name,
      workflow.description,
      workflow.status,
      workflow.startAt,
      workflow.endAt,
      workflow.scheduleType,
      workflow.scheduleExpression,
      workflow.metadata,
      workflow.createdAt,
      workflow.updatedAt,
    ];

    const result = await pool.query(query, values);

    console.log("Workflow Created");

    return snakeToCamel(result.rows[0]);
  }

  async findById(workflowId:String,client?: PoolClient){
    const executor = client || pool;
    const result = await executor.query("SELECT * from workflows where id = $1",[workflowId]);
    return snakeToCamel(result.rows[0]);
  }

    async getWorkflows(){
    const result = await pool.query("SELECT * from workflows;");
    return snakeToCamel(result.rows);
  }

}
