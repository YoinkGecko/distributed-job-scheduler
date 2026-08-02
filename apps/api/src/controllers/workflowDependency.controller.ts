import {Request,Response} from "express";
import {WorkflowDependencyService} from "../services/WorkflowDependency.service.js"
import {WorkflowRepository,WorkflowJobRepository,WorkflowDependencyRepository,} from "@scheduler/database";

const workflowRepository = new WorkflowRepository();
const workflowJobRepository = new WorkflowJobRepository();
const workflowDependencyRepository = new WorkflowDependencyRepository();

const workflowDependencyService = new WorkflowDependencyService(workflowRepository,workflowJobRepository,workflowDependencyRepository);

export async function createDependencies(req:Request,res:Response){
  const workflowId = req.params.workflowId as string;
  const dependencies = req.body.dependencies;
  await workflowDependencyService.createDependencies(workflowId,dependencies);
  res.status(201).json({ message: 'Dependencies created successfully' });
}