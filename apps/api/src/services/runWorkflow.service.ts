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
  OutboxRepository,
  WorkflowRepository,
  WorkflowJobRepository,
  WorkflowDependencyRepository,
  WorkflowExecutionRepository,
  WorkflowJobExecutionRepository,
} from "@scheduler/database";

export class RunWorkflowService {
  constructor(
    private readonly workflowRepository: WorkflowRepository,
    private readonly workflowJobRepository: WorkflowJobRepository,
    private readonly jobRepository: JobRepository,

    private readonly workflowExecutionRepository: WorkflowExecutionRepository,
    private readonly workflowJobExecutionRepository: WorkflowJobExecutionRepository,

    private readonly workflowDependencyRepository: WorkflowDependencyRepository,

    private readonly outboxRepository: OutboxRepository,
  ) {}

  async runWorkflow(workflowId: string): Promise<any> {
    const client = await pool.connect();
    try {
      await this.checkWorkflow(workflowId,client);
      const workflowJobs = await this.loadWorkflowJobs(workflowId,client);
      const jobs = await this.loadJobs(workflowJobs,client);
      const workflowExecution = await this.createWorkflowExecution(workflowId,client);
      const workflowJobExecutions = this.buildWorkflowJobExecutions(
        workflowExecution.id,
        workflowJobs,
        jobs,
        client
      );

      const savedWorkflowJobExecutions = await this.saveWorkflowJobExecutions(
        workflowJobExecutions,
        client
      );

      const rootJobs = await this.findRootWorkflowJobs(workflowId,client);
      await this.makeRootJobsPending(workflowExecution.id, rootJobs,client);
      await this.publishRootJobs(workflowExecution.id,client);
      return workflowExecution;
    } catch {
      await client.query("ROLLBACK");
    } finally {
      client.release();
    }
  }

  // 1. checkWorkflow
  private async checkWorkflow(workflowId: string,client:PoolClient): Promise<void> {
    const workflow = await this.workflowRepository.findById(workflowId,client);

    if (!workflow) {
      throw new Error("Workflow not found.");
    }

    if (workflow.status !== WorkflowStatus.ACTIVE) {
      throw new Error("Workflow is not active.");
    }
  }

  // 2.loadWorkflowJobs
  private async loadWorkflowJobs(workflowId: string,client:PoolClient): Promise<WorkflowJob[]> {
    const workflowJobs =
      await this.workflowJobRepository.findByWorkflowId(workflowId,client);

    if (workflowJobs.length === 0) {
      throw new Error("Workflow does not contain any jobs.");
    }

    return workflowJobs;
  }

  // 3. loadJobs (original jobs)
  private async loadJobs(workflowJobs: WorkflowJob[],client:PoolClient): Promise<Job[]> {
    const jobIds = workflowJobs.map((workflowJob) => workflowJob.jobId);

    const jobs = await this.jobRepository.findByJobsIds(jobIds,client); //to get all details of jobs

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
    client:PoolClient
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

    return await this.workflowExecutionRepository.create(workflowExecution,client);
  }

  // 5. buildWorkflowJobExecutions
  private buildWorkflowJobExecutions(
    workflowExecutionId: string,
    workflowJobs: WorkflowJob[],
    jobs: Job[],
    client:PoolClient
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
    client:PoolClient
  ): Promise<WorkflowJobExecution[]> {
    return await this.workflowJobExecutionRepository.create(
      workflowJobExecutions,
    );
  }

  // 7. findRootWorkflowJobs
  private async findRootWorkflowJobs(
    workflowId: string,
    client:PoolClient
  ): Promise<WorkflowJob[]> {
    const rootJobs =
      await this.workflowJobRepository.findRootWorkflowJobs(workflowId,client);

    if (rootJobs.length === 0) {
      throw new Error("Workflow contains no root jobs.");
    }

    return rootJobs;
  }

  // 8. makeRootJobsPending
  private async makeRootJobsPending(
    workflowExecutionId: string,
    rootWorkflowJobs: WorkflowJob[],
    client:PoolClient
  ): Promise<void> {
    const workflowJobIds = rootWorkflowJobs.map((job) => job.id);

    await this.workflowJobExecutionRepository.updateStatusByWorkflowJobIds(
      workflowExecutionId,
      workflowJobIds,
      JobStatus.PENDING,
      client
    );
  }

  // 9. PublishRootJobs
  private async publishRootJobs(
    workflowJobExecutions: WorkflowJobExecution[],
    client: PoolClient,
  ): Promise<void> {
    for (const workflowJobExecution of workflowJobExecutions) {
      const event: OutboxEvent<JobCreatedEventPayload> = {
        id: crypto.randomUUID(),

        aggregateType: AggregateType.WORKFLOW_JOB_EXECUTION,

        aggregateId: workflowJobExecution.id,

        eventType: OutboxEventType.WORKFLOW_JOB_READY,

        payload: {
          jobId: workflowJobExecution.id,
          type: "",
          priority: 1,
        },
      };

      await this.outboxRepository.createEvent(event, client);
    }
  }
}
