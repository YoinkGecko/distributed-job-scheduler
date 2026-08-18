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

    this.validateCreateWorkflowInput(input);

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

  private validateCreateWorkflowInput(input: CreateWorkflowInput): void {
    // Name
    if (!input.name || input.name.trim().length === 0) {
      throw new Error("Workflow name is required.");
    }

    // Description length
    if (input.description && input.description.length > 1000) {
      throw new Error("Description cannot exceed 1000 characters.");
    }

    // Start / End
    if (input.startAt && input.endAt && input.startAt > input.endAt) {
      throw new Error("startAt must be before endAt.");
    }

    this.validateSchedule(input);
  }

  private validateSchedule(input: CreateWorkflowInput): void {
    switch (input.scheduleType) {
      case ScheduleType.ONCE:
        this.validateOnce(input.scheduleExpression);
        break;

      case ScheduleType.INTERVAL:
        this.validateInterval(input.scheduleExpression);
        break;

      case ScheduleType.CRON:
        this.validateCron(input.scheduleExpression);
        break;

      default:
        throw new Error("Invalid schedule type.");
    }
  }

  private validateOnce(expression: string): void {
    const date = new Date(expression);

    if (Number.isNaN(date.getTime())) {
      throw new Error("Invalid ONCE schedule.");
    }
  }

  private validateInterval(expression: string): void {
    const regex = /^\d+(m|h|d)$/;

    if (!regex.test(expression)) {
      throw new Error("Invalid interval expression.");
    }
  }

  private validateCron(expression: string): void {
    const parts = expression.trim().split(/\s+/);

    if (parts.length !== 5) {
      throw new Error("Cron expression must contain 5 fields.");
    }
  }

  async getWorkflows(){
    return await this.workflowRepository.getWorkflows();
  }
}
