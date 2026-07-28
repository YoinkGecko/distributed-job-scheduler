class JobDependencyRepository {
    async createMany(){
        const createManyQuery = `INSERT INTO job_dependencies (
            id,
            parent_job_id,
            child_job_id
            ) VALUES ($1,$2,$3);` ;
    }

    async findParents(){
        const findParentsQuery = `SELECT parent_job_id
            FROM job_dependencies
            WHERE child_job_id = $1;`;
    }

    async findChildren(){
        const findChildrenQuery = `SELECT child_job_id
            FROM job_dependencies
            WHERE parent_job_id = $1;`;
    }

}