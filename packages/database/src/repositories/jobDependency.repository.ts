import { PoolClient } from "@scheduler/database";
import { JobDependency } from "@scheduler/types";

export class JobDependencyRepository {
  async createDependency(
    dependency: JobDependency,
    client: PoolClient,
  ): Promise<JobDependency> {
    const createDependencyQuery = `INSERT INTO job_dependencies(
            id,
            parent_job_id,
            child_job_id,
            created_at
        )
        VALUES(
            $1,$2,$3,$4
        )
        RETURNING *;`;

    return dependency;
  }

  async findParents(jobId: string) {
    const findParentsQuery = `SELECT parent_job_id
        FROM job_dependencies
        WHERE child_job_id = $1;`;
  }

  async findChildren(jobId: string) {
    const findChildrenQuery = `SELECT child_job_id
        FROM job_dependencies
        WHERE parent_job_id = $1;`;
  }
}
