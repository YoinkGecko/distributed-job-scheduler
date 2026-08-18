import { Request, Response } from "express";
import { WorkflowRepository } from "@scheduler/database";
import { WorkflowService } from "../services/workflow.service.js";

const workflowRepository = new WorkflowRepository();
const workflowService = new WorkflowService(workflowRepository);

export async function createWorkflow(req: Request, res: Response) {
  const workflow = await workflowService.createWorkflow(req.body);

  return res.status(201).json({
    message: "Workflow created successfully",
    workflow,
  });
}

export async function getWorkflows(req: Request, res: Response) {
  const workflows = await workflowService.getWorkflows();

  return res.status(201).json({length:workflows.length,workflows});
}
