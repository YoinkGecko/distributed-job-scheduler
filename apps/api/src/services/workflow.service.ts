import { randomUUID } from "crypto";

import { pool } from "@scheduler/database";

import {
  WorkflowRepository,
  WorkflowJobRepository,
  JobDependencyRepository,
  JobRepository,
} from "@scheduler/database";

import {
  Workflow,
  WorkflowJob,
  JobDependency,
  WorkflowStatus,
  CreateWorkflowRequest,
} from "@scheduler/types";

export class WorkflowService {
  constructor(
    private workflowRepository = new WorkflowRepository(),
    private workflowJobRepository = new WorkflowJobRepository(),
    private dependencyRepository = new JobDependencyRepository(),
    private jobRepository = new JobRepository(),
  ) {}

  async createWorkflow(request: CreateWorkflowRequest): Promise<Workflow> {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Step 1
      // Validate jobs
      for (const jobId of request.jobIds) {
        const job = await this.jobRepository.findById(jobId);

        if (!job) {
          throw new Error(`Job ${jobId} does not exist`);
        }
      }

      // Step 2
      // Create workflow
      const workflow = await this.workflowRepository.createWorkflow(
        {
          id: randomUUID(),
          name: request.name,
          status: WorkflowStatus.PENDING,
          metadata: request.metadata ?? {},
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        client,
      );

      // Step 3
      // Attach jobs
      const workflowJobMap = new Map<string, string>();
      for (const jobId of request.jobIds) {
        const workflowJob = await this.workflowJobRepository.createWorkflowJob(
          {
            id: randomUUID(),
            workflowId: workflow.id,
            jobId,
            createdAt: new Date(),
          },
          client,
        );

        workflowJobMap.set(jobId, workflowJob.id);
      }

      // Step 4
      // Create dependencies
      for (const dependency of request.dependencies) {
        const parentWorkflowJobId = workflowJobMap.get(dependency.parentJobId);

        const childWorkflowJobId = workflowJobMap.get(dependency.childJobId);

        if (!parentWorkflowJobId || !childWorkflowJobId) {
          throw new Error("Invalid dependency");
        }

        await this.dependencyRepository.createDependency(
          {
            id: randomUUID(),
            parentWorkflowJobId,
            childWorkflowJobId,
            createdAt: new Date(),
          },
          client,
        );
      }

      await client.query("COMMIT");

      return workflow;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
