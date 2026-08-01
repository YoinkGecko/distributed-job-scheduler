import crypto from "crypto";

import { WorkflowRepository } from "@scheduler/database";

import {
  CreateWorkflowInput,
  Workflow,
  WorkflowStatus,
  ScheduleType,
} from "@scheduler/types";

export class WorkflowService {
  constructor(private readonly workflowRepository: WorkflowRepository) {}

  async createWorkflow(input: CreateWorkflowInput): Promise<Workflow> {
    const now = new Date();

    if (!Object.values(ScheduleType).includes(input.scheduleType)) {
      throw new Error(
        `Invalid schedule type: ${input.scheduleType}. Allowed values: ${Object.values(ScheduleType).join(", ")}`,
      );
    }

    const workflow: Workflow = {
      id: crypto.randomUUID(),
      name: input.name,
      description: input.description ?? null,
      status: WorkflowStatus.ACTIVE,
      startAt: input.startAt ?? null,
      endAt: input.endAt ?? null,
      scheduleType: input.scheduleType,
      scheduleExpression: input.scheduleExpression,
      metadata: input.metadata ?? {},
      createdAt: now,
      updatedAt: now,
    };

    console.log("\nCreating Workflow:", workflow.id);

    return await this.workflowRepository.create(workflow);
  }
}
