import { Request, Response } from "express";
import {
  JobRepository,
  OutboxRepository,
  WorkflowRepository,
  WorkflowJobRepository,
  WorkflowDependencyRepository,
  WorkflowExecutionRepository,
  WorkflowJobExecutionRepository,
} from "@scheduler/database";
import { RunWorkflowService } from "../services/runWorkflow.service.js";

const jobRepository = new JobRepository();
const outboxRepository = new OutboxRepository();
const workflowRepository = new WorkflowRepository();
const workflowJobRepository = new WorkflowJobRepository();
const workflowDependencyRepository = new WorkflowDependencyRepository();
const workflowExecutionRepository = new WorkflowExecutionRepository();
const workflowJobExecutionRepository = new WorkflowJobExecutionRepository();

const runWorkflowService = new RunWorkflowService(
  workflowRepository,
  workflowJobRepository,
  jobRepository,
  workflowExecutionRepository,
  workflowJobExecutionRepository,
  workflowDependencyRepository,
  outboxRepository,
);

export async function runWorkflow(req: Request, res: Response) {
  const { workflowId } = req.params;
  const workflowExecution = await runWorkflowService.runWorkflow(
    workflowId as string,
  );
  return res.status(201).json({
    message: "Workflow executed successfully",
    workflowExecution,
  });
}
