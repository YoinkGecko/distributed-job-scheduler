import { Request, Response } from "express";
import { WorkflowJobService } from "../services/workflowJob.service.js";
import {
  JobRepository,
  WorkflowRepository,
  WorkflowJobRepository,
} from "@scheduler/database";

const jobRepository = new JobRepository();

const workflowRepository = new WorkflowRepository();
const workflowJobRepository = new WorkflowJobRepository();

const workflowJobService = new WorkflowJobService(
  jobRepository,
  workflowRepository,
  workflowJobRepository,
);

export async function addJobToWorkflow(req: Request,res: Response,): Promise<void> {
  const { workflowId } = req.params;

  const jobId = req.body.jobId ?? req.body.jobIds;

  if (!jobId) {
    throw new Error("jobId or jobIds is required.");
  }

  const workflowJob = await workflowJobService.addJobToWorkflow(
    workflowId as string,
    jobId,
  );

  res.status(201).json({
    message: "Job added to workflow.",
    workflowJob,
  });
}

export async function getWorkflowJobs(req: Request,res: Response,): Promise<void> {
  const { workflowId } = req.params;
  const jobs = await workflowJobService.getWorkflowJobs(workflowId as string);
  res.status(201).json(jobs);
}
