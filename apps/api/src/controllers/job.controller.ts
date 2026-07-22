import { Request, Response } from "express";
import { JobRepository } from "../repositories/job.repository.js";
import { JobService } from "../services/job.service.js";

const repository = new JobRepository();
const jobService = new JobService(repository);

export async function createJob(_req: Request, res: Response) {
    await jobService.createJob();
    return res.status(200).json({
        message: "Controller reached",
    });
}