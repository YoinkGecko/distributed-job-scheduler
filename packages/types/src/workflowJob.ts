export interface AddJobToWorkflowInput {
    workflowId: string;
    jobId: string;
}

export interface WorkflowJob {
    id: string;
    workflowId: string;
    jobId: string;
    createdAt: Date;
}