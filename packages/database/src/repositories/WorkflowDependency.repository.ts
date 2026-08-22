import { pool } from "../../pool.js";
import { snakeToCamel, PoolClient } from "@scheduler/database";
import { WorkflowJobDependency } from "@scheduler/types";

export class WorkflowDependencyRepository {
  async createDependencies(
    dependencies: WorkflowJobDependency[],
  ): Promise<WorkflowJobDependency[]> {
    const placeholders = dependencies
      .map((_, index) => {
        const offset = index * 4;

        return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4})`;
      })
      .join(", ");

    const values = dependencies.flatMap((dependency) => [
      dependency.id,
      dependency.parentWorkflowJobId,
      dependency.childWorkflowJobId,
      dependency.createdAt,
    ]);

    const query = `
      INSERT INTO workflow_job_dependencies (
        id,
        parent_workflow_job_id,
        child_workflow_job_id,
        created_at
      )
      VALUES
      ${placeholders}
      RETURNING *;
    `;

    const result = await pool.query(query, values);

    return result.rows.map((row) => snakeToCamel(row));
  }

  async findExistingDependencies(
    dependencies: {
      parentWorkflowJobId: string;
      childWorkflowJobId: string;
    }[],
  ): Promise<WorkflowJobDependency[]> {
    if (dependencies.length === 0) {
      return [];
    }

    const placeholders = dependencies
      .map((_, index) => {
        const offset = index * 2;

        return `($${offset + 1}, $${offset + 2})`;
      })
      .join(", ");

    const values = dependencies.flatMap((dependency) => [
      dependency.parentWorkflowJobId,
      dependency.childWorkflowJobId,
    ]);

    const query = `
      SELECT *
      FROM workflow_job_dependencies
      WHERE
      (parent_workflow_job_id, child_workflow_job_id)
      IN (
        ${placeholders}
      );
    `;

    const result = await pool.query(query, values);

    return result.rows.map((row) => snakeToCamel(row));
  }

  async findChildren(
    parentWorkflowJobId: string,
    client?: PoolClient,
  ): Promise<string[]> {
    const executor = client ?? pool;
    const query = `
    SELECT child_workflow_job_id
    FROM workflow_job_dependencies
    WHERE parent_workflow_job_id = $1;
  `;

    const result = await executor.query(query, [parentWorkflowJobId]);

    return snakeToCamel(result.rows.map((row) => row.child_workflow_job_id));
  }

  async findDependenciesByWorkflowId(workflowId: string) {
    const query = `
      SELECT
        d.id,
        d.parent_workflow_job_id,
        parent.job_id AS parent_job_id,
        d.child_workflow_job_id,
        child.job_id AS child_job_id,
        d.created_at
      FROM workflow_job_dependencies d
      JOIN workflow_jobs parent
        ON parent.id = d.parent_workflow_job_id
      JOIN workflow_jobs child
        ON child.id = d.child_workflow_job_id
      WHERE parent.workflow_id = $1
        AND child.workflow_id = $1
      ORDER BY d.created_at ASC;
    `;

    const result = await pool.query(query, [workflowId]);
    return result.rows.map((row) => snakeToCamel(row));
  }
}
