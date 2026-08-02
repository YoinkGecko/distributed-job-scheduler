//----------------------------------------------------------------------------------------------------
/*createDependencies()

↓

Validate Workflow Exists

↓

Validate Workflow is ACTIVE

↓

Validate all Workflow Jobs exist

↓

Validate all Workflow Jobs belong to this Workflow

↓

Validate parent != child

↓

Validate dependency doesn't already exist

↓

Create WorkflowJobDependency objects

↓

Repository.createDependencies()
*/ 
//----------------------------------------------------------------------------------------------------
import {WorkflowStatus,CreateWorkflowDependencyInput,WorkflowJobDependency} from "@scheduler/types";
import {WorkflowRepository,WorkflowJobRepository,WorkflowDependencyRepository} from "@scheduler/database";
import crypto from "crypto";

export class WorkflowDependencyService {
  constructor(
    private readonly workflowRepository: WorkflowRepository,
    private readonly workflowJobRepository: WorkflowJobRepository,
    private readonly workflowDependencyRepository: WorkflowDependencyRepository,
  ) {}

  async createDependencies(
    workflowId: string,
    dependencies: CreateWorkflowDependencyInput[],
  ): Promise<WorkflowJobDependency[]> {

    await this.checkWorkflow(workflowId);

    await this.checkWorkflowJobs(workflowId, dependencies);

    this.validateSelfDependency(dependencies);

    await this.checkExistingDependencies(dependencies);

    const workflowDependencies =this.buildWorkflowDependencies(dependencies);

    return await this.workflowDependencyRepository.createDependencies(workflowDependencies,);
  }

  private async checkWorkflow(
  workflowId: string,
    ): Promise<void> {

  const workflow =
    await this.workflowRepository.findById(workflowId);

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

    const workflowJobs = await this.workflowJobRepository.findByIds(workflowJobIds,);

    if (workflowJobs.length !== workflowJobIds.length) {
        throw new Error(
            "One or more workflow jobs do not exist.",
        );
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

  private validateSelfDependency(dependencies: CreateWorkflowDependencyInput[],): void {

  for (const dependency of dependencies) {

    if (
      dependency.parentWorkflowJobId ===
      dependency.childWorkflowJobId
    ) {
      throw new Error(
        "A workflow job cannot depend on itself.",
      );
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

  throw new Error(
    `Dependencies already exist: ${duplicates.join(", ")}`,
  );
}

  private buildWorkflowDependencies( dependencies: CreateWorkflowDependencyInput[],): WorkflowJobDependency[] {
  const now = new Date();

  return dependencies.map((dependency) => ({
    id: crypto.randomUUID(),
    parentWorkflowJobId:dependency.parentWorkflowJobId,
    childWorkflowJobId:dependency.childWorkflowJobId,
    createdAt: now,
  }));

}
}