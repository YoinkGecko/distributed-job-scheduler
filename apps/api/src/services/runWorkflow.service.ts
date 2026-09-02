import crypto from "crypto";
import { PoolClient, pool } from "@scheduler/database";
import {
  WorkflowExecution,
  WorkflowStatus,
  WorkflowJob,
  Job,
  WorkflowExecutionStatus,
  JobStatus,
  WorkflowJobExecution,
  OutboxEvent,
  JobCreatedEventPayload,
  AggregateType,
  OutboxEventType,
} from "@scheduler/types";
import {
  JobRepository,
  WorkflowRepository,
  WorkflowJobRepository,
  WorkflowDependencyRepository,
  WorkflowExecutionRepository,
  WorkflowJobExecutionRepository,
} from "@scheduler/database";
import { OutboxService } from "./outbox.service.js";

export class RunWorkflowService {
  constructor(
    private readonly workflowRepository: WorkflowRepository,
    private readonly workflowJobRepository: WorkflowJobRepository,
    private readonly jobRepository: JobRepository,

    private readonly workflowExecutionRepository: WorkflowExecutionRepository,
    private readonly workflowJobExecutionRepository: WorkflowJobExecutionRepository,

    private readonly workflowDependencyRepository: WorkflowDependencyRepository,
    private readonly outboxService: OutboxService,
  ) {}

  async runWorkflow(workflowId: string): Promise<WorkflowExecution> {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      console.log("checkWorkflow");
      await this.checkWorkflow(workflowId, client);

      console.log("loadWorkflowJobs");
      const workflowJobs = await this.loadWorkflowJobs(workflowId, client);

      console.log("loadJobs");
      const jobs = await this.loadJobs(workflowJobs, client);

      console.log("createWorkflowExecution");
      const workflowExecution = await this.createWorkflowExecution(
        workflowId,
        client,
      );

      console.log("buildWorkflowJobExecutions");
      const workflowJobExecutions = this.buildWorkflowJobExecutions(
        workflowExecution.id,
        workflowJobs,
        jobs,
      );

      console.log("saveWorkflowJobExecutions");
      const savedWorkflowJobExecutions = await this.saveWorkflowJobExecutions(
        workflowJobExecutions,
        client,
      );

      console.log("findRootWorkflowJobs");
      const rootWorkflowJobs = await this.findRootWorkflowJobs(
        workflowId,
        client,
      );

      console.log("makeRootJobsPending");
      await this.makeRootJobsPending(
        workflowExecution.id,
        rootWorkflowJobs,
        client,
      );

      console.log("findRootWorkflowJobExecutions");
      const rootWorkflowJobExecutions = this.findRootWorkflowJobExecutions(
        savedWorkflowJobExecutions,
        rootWorkflowJobs,
      );

      console.log("publishRootJobs\n\n\n\n");
      await this.publishRootJobs(rootWorkflowJobExecutions, client);

      await client.query("COMMIT");

      return workflowExecution;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  // 1. checkWorkflow
  private async checkWorkflow(
    workflowId: string,
    client: PoolClient,
  ): Promise<void> {
    const workflow = await this.workflowRepository.findById(workflowId, client);

    if (!workflow) {
      throw new Error("Workflow not found.");
    }

    if (workflow.status !== WorkflowStatus.ACTIVE) {
      throw new Error("Workflow is not active.");
    }
  }

  // 2.loadWorkflowJobs
  private async loadWorkflowJobs(
    workflowId: string,
    client: PoolClient,
  ): Promise<WorkflowJob[]> {
    const workflowJobs = await this.workflowJobRepository.findByWorkflowId(
      workflowId,
      client,
    );

    if (workflowJobs.length === 0) {
      throw new Error("Workflow does not contain any jobs.");
    }

    return workflowJobs;
  }

  // 3. loadJobs (original jobs)
  private async loadJobs(
    workflowJobs: WorkflowJob[],
    client: PoolClient,
  ): Promise<Job[]> {
    const jobIds = workflowJobs.map((workflowJob) => workflowJob.jobId);

    const jobs = await this.jobRepository.findByJobsIds(jobIds, client); //to get all details of jobs

    if (jobs.length !== jobIds.length) {
      throw new Error(
        "One or more jobs referenced by the workflow no longer exist.",
      );
    }

    return jobs;
  }

  // 4. createWorkflowExecution
  private async createWorkflowExecution(
    workflowId: string,
    client: PoolClient,
  ): Promise<WorkflowExecution> {
    const now = new Date();

    const workflowExecution: WorkflowExecution = {
      id: crypto.randomUUID(),
      workflowId,
      status: WorkflowExecutionStatus.RUNNING,
      startedAt: now,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    return await this.workflowExecutionRepository.create(
      workflowExecution,
      client,
    );
  }

  // 5. buildWorkflowJobExecutions
  private buildWorkflowJobExecutions(
    workflowExecutionId: string,
    workflowJobs: WorkflowJob[],
    jobs: Job[],
  ): WorkflowJobExecution[] {
    const now = new Date();

    const jobMap = new Map(jobs.map((job) => [job.id, job]));

    return workflowJobs.map((workflowJob) => {
      const job = jobMap.get(workflowJob.jobId);

      if (!job) {
        throw new Error(`Job ${workflowJob.jobId} not found.`);
      }

      return {
        id: crypto.randomUUID(),
        workflowExecutionId,
        workflowJobId: workflowJob.id,
        type: job.type,
        payload: job.payload,
        status: JobStatus.WAITING,
        priority: job.priority,
        scheduledAt: job.scheduledAt,
        createdAt: now,
        updatedAt: now,
        startedAt: null,
        completedAt: null,
        retryCount: 0,
        maxRetries: job.maxRetries,
        assignedWorker: null,
        heartbeatAt: null,
        lockExpiresAt: null,
        lastError: null,
      };
    });
  }

  // 6. saveWorkflowJobExecutions
  private async saveWorkflowJobExecutions(
    workflowJobExecutions: WorkflowJobExecution[],
    client: PoolClient,
  ): Promise<WorkflowJobExecution[]> {
    return await this.workflowJobExecutionRepository.create(
      workflowJobExecutions,
      client,
    );
  }

  // 7. findRootWorkflowJobs
  private async findRootWorkflowJobs(
    workflowId: string,
    client: PoolClient,
  ): Promise<WorkflowJob[]> {
    await this.workflowJobExecutionRepository.updateWorkflowExecutionStatus();
    const rootJobs = await this.workflowJobRepository.findRootWorkflowJobs(
      workflowId,
      client,
    );

    if (rootJobs.length === 0) {
      throw new Error("Workflow contains no root jobs.");
    }

    return rootJobs;
  }

  // 8. makeRootJobsPending
  private async makeRootJobsPending(
    workflowExecutionId: string,
    rootWorkflowJobs: WorkflowJob[],
    client: PoolClient,
  ): Promise<void> {
    const workflowJobIds = rootWorkflowJobs.map((job) => job.id);

    await this.workflowJobExecutionRepository.updateStatusByWorkflowJobIds(
      workflowExecutionId,
      workflowJobIds,
      JobStatus.PENDING,
      client,
    );
  }

  private findRootWorkflowJobExecutions(
    workflowJobExecutions: WorkflowJobExecution[],
    rootWorkflowJobs: WorkflowJob[],
  ): WorkflowJobExecution[] {
    const rootWorkflowJobIds = new Set(rootWorkflowJobs.map((job) => job.id));

    return workflowJobExecutions.filter((execution) =>
      rootWorkflowJobIds.has(execution.workflowJobId),
    );
  }

  // 9. PublishRootJobs
  private async publishRootJobs(
    workflowJobExecutions: WorkflowJobExecution[],
    client: PoolClient,
  ): Promise<void> {
    await this.workflowJobExecutionRepository.updateWorkflowExecutionStatus();
    for (const workflowJobExecution of workflowJobExecutions) {
      await this.outboxService.createWorkflowJobExecutionEvent(
        {
          workflowJobExecutionId: workflowJobExecution.id,
        },
        client,
      );
    }
  }

  async getExecution(workflowId:string){
    return await this.workflowExecutionRepository.getExecution(workflowId);
  }

  async getExecutionJobs(workflowExecutionId:string){
    return await this.workflowExecutionRepository.getExecutionJobs(workflowExecutionId);
  }
}
