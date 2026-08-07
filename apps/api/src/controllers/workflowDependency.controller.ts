import { Request, Response } from "express";
import { WorkflowDependencyService } from "../services/WorkflowDependency.service.js";
import {
  WorkflowRepository,
  WorkflowJobRepository,
  WorkflowDependencyRepository,
  WorkflowJobExecutionRepository,
  OutboxRepository,
} from "@scheduler/database";
import { OutboxService } from "../services/outbox.service.js";

const workflowRepository = new WorkflowRepository();
const workflowJobRepository = new WorkflowJobRepository();
const workflowDependencyRepository = new WorkflowDependencyRepository();
const workflowJobExecutionRepository = new WorkflowJobExecutionRepository();
const outboxRepository = new OutboxRepository();
const outboxService = new OutboxService(outboxRepository);
const workflowDependencyService = new WorkflowDependencyService(
  workflowRepository,
  workflowJobRepository,
  workflowDependencyRepository,
  workflowJobExecutionRepository,
  outboxService,
);

export async function createDependencies(req: Request, res: Response) {
  const workflowId = req.params.workflowId as string;
  const dependencies = req.body.dependencies;
  await workflowDependencyService.createDependencies(workflowId, dependencies);
  res.status(201).json({ message: "Dependencies created successfully" });
}
