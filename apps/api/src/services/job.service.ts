import { JobRepository } from "../repositories/job.repository.js";
import { CreateJobInput } from "@scheduler/types";

export class JobService {
  constructor(private readonly repository: JobRepository) {}

    async createJob(input: CreateJobInput) {
        console.log("Job Service reached");
        await this.repository.create();
  }
}
