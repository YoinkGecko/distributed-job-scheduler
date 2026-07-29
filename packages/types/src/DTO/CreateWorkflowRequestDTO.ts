export interface CreateWorkflowRequest {
  name: string;
  metadata?: Record<string, unknown>;
  jobIds: string[];
  dependencies: {
    parentJobId: string;
    childJobId: string;
  }[];
}