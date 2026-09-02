import {
  WorkflowRepository,
  WorkflowJobRepository,
  WorkflowExecutionRepository,
  WorkflowJobExecutionRepository,
} from "@scheduler/database";

import { randomUUID } from "crypto";
import {
  WorkflowExecution,
  WorkflowExecutionStatus,
  JobStatus,
} from "@scheduler/types";
import { pool, PoolClient } from "@scheduler/database";

export class WorkflowExecutionService {
  constructor(
    private workflowRepository: WorkflowRepository,
    private workflowJobRepository: WorkflowJobRepository,
    private workflowExecutionRepository: WorkflowExecutionRepository,
    private workflowJobExecutionRepository: WorkflowJobExecutionRepository,
  ) {}

  async runWorkflow(workflowId: string): Promise<WorkflowExecution> {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const workflow = await this.validateWorkflow(workflowId);

      const execution = await this.createExecution(workflow.id, client);

      await this.createWorkflowJobExecutions(execution.id, workflow.id, client);

      await client.query("COMMIT");

      return execution;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  private async validateWorkflow(workflowId: string) {
    const cleanId = workflowId.trim();
    const workflow = await this.workflowRepository.findById(cleanId);

    if (!workflow) {
      throw new Error(`Workflow not found: ${cleanId}`);
    }

    return workflow;
  }

  private async createExecution(
    workflowId: string,
    client: PoolClient,
  ): Promise<WorkflowExecution> {
    const execution: WorkflowExecution = {
      id: randomUUID(),
      workflowId,
      status: WorkflowExecutionStatus.RUNNING,
      startedAt: new Date(),
      completedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return this.workflowExecutionRepository.create(execution, client);
  }

  private async createWorkflowJobExecutions(
    workflowExecutionId: string,
    workflowId: string,
    client: PoolClient,
  ): Promise<void> {
    const workflowJobs =
      await this.workflowJobRepository.findByWorkflowId(workflowId);

    for (const workflowJob of workflowJobs) {
      await this.workflowJobExecutionRepository.create(
        {
          id: randomUUID(),
          workflowExecutionId,
          workflowJobId: workflowJob.id,
          status: JobStatus.WAITING,
          retryCount: 0,
          lastError: null,
          startedAt: null,
          completedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        client,
      );
    }
  }
}
