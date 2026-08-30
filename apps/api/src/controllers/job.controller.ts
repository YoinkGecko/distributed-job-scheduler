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
  try {
    // Parse query parameters with defaults
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || '';
    const status = req.query.status ? (req.query.status as string).split(',') : [];
    const priority = req.query.priority ? (req.query.priority as string).split(',') : [];
    const sort = (req.query.sort as string) || 'scheduledAt';
    const order = (req.query.order as string) || 'desc';

    const result = await jobService.getJobs({
      page,
      limit,
      search,
      status,
      priority,
      sort,
      order,
    });

    return res.status(200).json(result); // { jobs, total }
  } catch (error) {
    console.error('Error fetching jobs:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
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

export async function getJobMetrics(req: Request, res: Response) {
  try {
    const metrics = await jobService.getJobMetrics();
    return res.status(200).json(metrics);
  } catch (error) {
    console.error('Error fetching job metrics:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}