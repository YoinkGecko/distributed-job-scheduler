import { PoolClient, snakeToCamel } from "@scheduler/database";
import { pool } from "../../pool.js";
import { JobDependency } from "@scheduler/types";

export class JobDependencyRepository {
  async createDependency(
    dependency: JobDependency,
    client: PoolClient,
  ): Promise<JobDependency> {
    const createDependencyQuery = `
      INSERT INTO job_dependencies (
        id,
        parent_workflow_job_id,
        child_workflow_job_id,
        created_at
      )
      VALUES (
        $1, $2, $3, $4
      )
      RETURNING *;
    `;

    const values = [
      dependency.id,
      dependency.parentWorkflowJobId,
      dependency.childWorkflowJobId,
      dependency.createdAt,
    ];

    const result = await client.query(createDependencyQuery, values);

    return snakeToCamel(result.rows[0]);
  }

  async findParents(workflowJobId: string): Promise<string[]> {
    const findParentsQuery = `
      SELECT parent_workflow_job_id
      FROM job_dependencies
      WHERE child_workflow_job_id = $1;
    `;

    const result = await pool.query(findParentsQuery, [workflowJobId]);

    return result.rows.map((row) => row.parent_workflow_job_id);
  }

  async findChildren(workflowJobId: string): Promise<string[]> {
    const findChildrenQuery = `
      SELECT child_workflow_job_id
      FROM job_dependencies
      WHERE parent_workflow_job_id = $1;
    `;

    const result = await pool.query(findChildrenQuery, [workflowJobId]);

    return result.rows.map((row) => row.child_workflow_job_id);
  }
}
