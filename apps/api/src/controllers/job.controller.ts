import { Request, Response } from "express";
import { JobService } from "../services/job.service.js";
const jobService = new JobService();

export async function createJob(_req: Request, res: Response) {
    await jobService.createJob();
    return res.status(200).json({
        message: "Controller reached",
    });
}