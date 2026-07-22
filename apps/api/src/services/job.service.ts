import { JobRepository } from "../repositories/job.repository.js";

export class JobService {
  constructor(private readonly repository: JobRepository) {}

  async createJob() {
    console.log("Job Service reached");

    await this.repository.create();
  }
}
