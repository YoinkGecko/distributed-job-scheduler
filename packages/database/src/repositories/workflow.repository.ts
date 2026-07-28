export class WorkflowRepository {
  async create() {
    const createQuery = `INSERT INTO workflows (
        id,
        name,
        status,
        metadata
        ) VALUES ($1,$2,$3,$4) RETURNING *;`;
  }

  async findById() {
    const findByIdQuery = `SELECT *
        FROM workflows
        WHERE id = $1;`;
  }

  async updateStatus() {
    const updateStatusQuery = `UPDATE workflows
        SET
        status = $2,
        updated_at = NOW()
        WHERE id = $1;`;
  }
}
