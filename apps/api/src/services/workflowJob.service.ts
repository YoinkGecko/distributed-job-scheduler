import { WorkflowJobRepository } from "@scheduler/database";
import { AddJobToWorkflowInput,WorkflowStatus } from "@scheduler/types";
import { WorkflowRepository } from "@scheduler/database";

export class WorkflowJobService {
  constructor(
    private readonly workflowRepository: WorkflowRepository,
    private readonly workflowJobRepository: WorkflowJobRepository,
  ) {}

  async addJobToWorkflow(workflowId: string, jobId: string | string[]) {

    //Validate workflow Exists and is Active
    const workflow = await this.workflowRepository.findWorkflowAndStatus(workflowId);
    if(!workflow){
        throw new Error("No workflow found");
    }
    if(workflow.status!=WorkflowStatus.ACTIVE){
        throw new Error("workflow is not active");
    }
    
    //Validate Job Exists

    //Check Job not already attached

    //Insert workflow_job that is call to WorkflowJobRepositoryrepository

  }
}
