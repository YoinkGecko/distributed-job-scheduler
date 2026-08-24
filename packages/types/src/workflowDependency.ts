export interface WorkflowJobDependency {
    id: string;
    parentWorkflowJobId: string;
    childWorkflowJobId: string;
    createdAt: Date;
}

export interface CreateWorkflowDependencyInput{
    parentWorkflowJobId: string;
    childWorkflowJobId:string;
}

export interface ResolvedWorkflowJobDependency {
  parentWorkflowJobId: string;
  childWorkflowJobId: string;
}