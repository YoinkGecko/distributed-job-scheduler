import {
  WorkflowStatus,
  CreateWorkflowDependencyInput,
  WorkflowJobDependency,
} from "@scheduler/types";
import {
  WorkflowRepository,
  WorkflowJobRepository,
  WorkflowDependencyRepository,
  WorkflowJobExecutionRepository,
  PoolClient,
} from "@scheduler/database";
import crypto from "crypto";
import { OutboxService } from "../services/outbox.service.js";

export class WorkflowDependencyService {
  constructor(
    private readonly workflowRepository: WorkflowRepository,
    private readonly workflowJobRepository: WorkflowJobRepository,
    private readonly workflowDependencyRepository: WorkflowDependencyRepository,
    private readonly workflowJobExecutionRepository: WorkflowJobExecutionRepository,
    private readonly outboxService: OutboxService,
  ) {}

  async createDependencies(
    workflowId: string,
    dependencies: CreateWorkflowDependencyInput[],
  ): Promise<WorkflowJobDependency[]> {
    await this.checkWorkflow(workflowId);

    await this.checkWorkflowJobs(workflowId, dependencies);

    this.validateSelfDependency(dependencies);

    await this.checkExistingDependencies(dependencies);

    const workflowDependencies = this.buildWorkflowDependencies(dependencies);

    return await this.workflowDependencyRepository.createDependencies(
      workflowDependencies,
    );
  }

  private async checkWorkflow(workflowId: string): Promise<void> {
    const workflow = await this.workflowRepository.findById(workflowId);

    if (!workflow) {
      throw new Error("Workflow not found.");
    }

    if (workflow.status !== WorkflowStatus.ACTIVE) {
      throw new Error("Workflow is not active.");
    }
  }

  private async checkWorkflowJobs(
    workflowId: string,
    dependencies: CreateWorkflowDependencyInput[],
  ): Promise<void> {
    const workflowJobIds = [
      ...new Set(
        dependencies.flatMap((dependency) => [
          dependency.parentWorkflowJobId,
          dependency.childWorkflowJobId,
        ]),
      ),
    ];

    const workflowJobs =
      await this.workflowJobRepository.findByIds(workflowJobIds);

    if (workflowJobs.length !== workflowJobIds.length) {
      throw new Error("One or more workflow jobs do not exist.");
    }
    const invalidJobs = workflowJobs.filter(
      (job) => job.workflowId !== workflowId,
    );
    if (invalidJobs.length > 0) {
      throw new Error(
        "One or more workflow jobs do not belong to this workflow.",
      );
    }
  }

  private validateSelfDependency(
    dependencies: CreateWorkflowDependencyInput[],
  ): void {
    for (const dependency of dependencies) {
      if (dependency.parentWorkflowJobId === dependency.childWorkflowJobId) {
        throw new Error("A workflow job cannot depend on itself.");
      }
    }
  }

  private async checkExistingDependencies(
    dependencies: CreateWorkflowDependencyInput[],
  ): Promise<void> {
    const existingDependencies =
      await this.workflowDependencyRepository.findExistingDependencies(
        dependencies,
      );

    if (existingDependencies.length === 0) {
      return;
    }

    const duplicates = existingDependencies.map(
      (dependency) =>
        `${dependency.parentWorkflowJobId} -> ${dependency.childWorkflowJobId}`,
    );

    throw new Error(`Dependencies already exist: ${duplicates.join(", ")}`);
  }

  private buildWorkflowDependencies(
    dependencies: CreateWorkflowDependencyInput[],
  ): WorkflowJobDependency[] {
    const now = new Date();

    return dependencies.map((dependency) => ({
      id: crypto.randomUUID(),
      parentWorkflowJobId: dependency.parentWorkflowJobId,
      childWorkflowJobId: dependency.childWorkflowJobId,
      createdAt: now,
    }));
  }

  private async releaseChildJobs(
    workflowExecutionId: string,
    completedWorkflowJobId: string,
    client: PoolClient,
  ): Promise<void> {
    // 1. Find all immediate children
    const childWorkflowJobIds =
      await this.workflowDependencyRepository.findChildren(
        completedWorkflowJobId,
      );

    // No children -> nothing to do
    if (childWorkflowJobIds.length === 0) {
      return;
    }

    // 2. Check every child
    for (const childWorkflowJobId of childWorkflowJobIds) {
      const ready =
        await this.workflowJobExecutionRepository.areAllParentsCompleted(
          workflowExecutionId,
          childWorkflowJobId,
        );

      if (!ready) {
        continue;
      }

      const childExecution =
        await this.workflowJobExecutionRepository.markPending(
          workflowExecutionId,
          childWorkflowJobId,
        );

      if (!childExecution) {
        continue;
      }

      await this.outboxService.createWorkflowJobExecutionEvent(
        {
          workflowJobExecutionId: childExecution.id,
        },
        client,
      );
    }
  }
}
