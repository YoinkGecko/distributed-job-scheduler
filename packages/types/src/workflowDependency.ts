export interface WorkflowJobDependency {
    id: string;
    parentWorkflowJobId: string;
    childWorkflowJobId: string;
    createdAt: Date;
}