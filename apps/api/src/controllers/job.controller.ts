import { Request, Response } from "express";
import { JobRepository } from "../repositories/job.repository.js";
import { JobService } from "../services/job.service.js";

const repository = new JobRepository();
const jobService = new JobService(repository);

export async function createJob(req: Request, res: Response) {
    const jobId = await jobService.createJob(req.body);
    return res.status(200).json({
        message: `Job Created ${jobId}`,
    });
}