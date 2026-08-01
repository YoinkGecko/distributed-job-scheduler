import { Request, Response } from "express";
import { WorkflowJobService } from "../services/workflowJob.service.js";
import { WorkflowJobRepository } from "@scheduler/database";
import { WorkflowService } from "../services/workflow.service.js";
import { WorkflowRepository } from "@scheduler/database";

const workflowRepository = new WorkflowRepository();
const workflowJobRepository = new WorkflowJobRepository();

const workflowJobService = new WorkflowJobService(
  workflowRepository,
  workflowJobRepository,
);

export async function addJobToWorkflow(
  req: Request,
  res: Response,
): Promise<void> {
  const { workflowId } = req.params;
  const jobId:string|string[] = req.body.jobId || req.body.jobIds;

  const workflowJob = await workflowJobService.addJobToWorkflow(workflowId as string,jobId);
  res.status(201).json({
    message: "Job added to workflow.",
    //workflowJob
  });
}
