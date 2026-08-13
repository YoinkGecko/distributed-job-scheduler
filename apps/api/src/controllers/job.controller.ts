import { Request, Response } from "express";
import { JobRepository } from "@scheduler/database";
import { OutboxRepository } from "@scheduler/database";
import { OutboxService } from "../services/outbox.service.js";
import { JobService } from "../services/job.service.js";

const jobRepository = new JobRepository();
const outboxRepository = new OutboxRepository();
const outboxService = new OutboxService(outboxRepository);
const jobService = new JobService(jobRepository, outboxService);

export async function createJob(req: Request, res: Response) {
  const createdJob = await jobService.createJob(req.body);
  return res.status(200).json({
    message: `Job Created `,
    createdJob,
  });
}

export async function getJobs(req: Request, res: Response) {
  const jobs = await jobService.getJobs();
  return res.status(200).json({
    length: jobs.length,
    jobs,
  });
}

export async function getJob(req: Request, res: Response) {
  const jobId = req.params.jobId as string;
  const job = await jobService.getJob(jobId);
  if (!job) {
    return res.status(400).send("Job not found");
  }
  return res.status(200).json({
    job,
  });
}
