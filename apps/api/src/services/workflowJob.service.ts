import { WorkflowJobRepository } from "@scheduler/database";
import { WorkflowStatus } from "@scheduler/types";
import { JobRepository, WorkflowRepository } from "@scheduler/database";

export class WorkflowJobService {
  constructor(
    private readonly jobRepository: JobRepository,
    private readonly workflowRepository: WorkflowRepository,
    private readonly workflowJobRepository: WorkflowJobRepository,
  ) {}

  async addJobToWorkflow(workflowId: string, jobId: string | string[]) {
    const jobIds = Array.isArray(jobId) ? jobId : [jobId];

    await this.checkWorkflow(workflowId);

    await this.checkJobsExist(jobIds);

    await this.ensureJobsNotAttached(workflowId, jobIds);

    return await this.workflowJobRepository.createWorkflowJobs(
      workflowId,
      jobIds,
    );
  }

  private async checkWorkflow(workflowId: string) {
    const workflow = await this.workflowRepository.findById(workflowId);
    if (!workflow) {
      throw new Error("No workflow found");
    }
    if (workflow.status != WorkflowStatus.ACTIVE) {
      throw new Error("workflow is not active");
    }
  }

  private async checkJobsExist(jobIds: string[]): Promise<void> {
    const foundJobs = await this.jobRepository.findByIds(jobIds);

    if (!foundJobs) {
      throw new Error("Jobs not found.");
    }

    if (foundJobs.length !== jobIds.length) {
      throw new Error("One or more jobs do not exist.");
    }
  }

  private async ensureJobsNotAttached(
    workflowId: string,
    jobIds: string[],
  ): Promise<void> {
    const attachedJobIds = await this.workflowJobRepository.isJobAttached(
      workflowId,
      jobIds,
    );

    if (attachedJobIds.length > 0) {
      throw new Error(`Jobs already attached: ${attachedJobIds.join(", ")}`);
    }
  }

  async getWorkflowJobs(workflowId: string){
    const jobs = await this.workflowJobRepository.getWorkflowJobs(workflowId);
    return jobs;
  }
}
