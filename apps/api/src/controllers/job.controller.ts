import { Request, Response } from "express";
import { JobRepository } from "@scheduler/database";
import { RedisPublisher } from "../publishers/redis.publisher.js";
import { JobService } from "../services/job.service.js";

const repository = new JobRepository();
const publisher = new RedisPublisher();
const jobService = new JobService(repository,publisher);

export async function createJob(req: Request, res: Response) {
    const createdJob = await jobService.createJob(req.body);
    return res.status(200).json({
        message: `Job Created `,createdJob,
    });
}