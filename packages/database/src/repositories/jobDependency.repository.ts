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
        parent_job_id,
        child_job_id,
        created_at
      )
      VALUES (
        $1, $2, $3, $4
      )
      RETURNING *;
    `;

    const values = [
      dependency.id,
      dependency.parentJobId,
      dependency.childJobId,
      dependency.createdAt,
    ];

    const result = await client.query(createDependencyQuery, values);

    return snakeToCamel(result.rows[0]);
  }

  async findParents(jobId: string): Promise<string[]> {
    const findParentsQuery = `
      SELECT parent_job_id
      FROM job_dependencies
      WHERE child_job_id = $1;
    `;

    const result = await pool.query(findParentsQuery, [jobId]);

    return result.rows.map((row) => row.parent_job_id);
  }

  async findChildren(jobId: string): Promise<string[]> {
    const findChildrenQuery = `
      SELECT child_job_id
      FROM job_dependencies
      WHERE parent_job_id = $1;
    `;

    const result = await pool.query(findChildrenQuery, [jobId]);

    return result.rows.map((row) => row.child_job_id);
  }
}
