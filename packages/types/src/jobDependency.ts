export enum DependencyPolicy {
  ALL = "ALL",
  ANY = "ANY",
}

export interface JobDependency {
  id: string;
  parentWorkflowJobId: string;
  childWorkflowJobId: string;
  createdAt: Date;
}