export enum DependencyPolicy {
  ALL = "ALL",
  ANY = "ANY",
}

export interface JobDependency {
    id: string;
    parentJobId: string;
    childJobId: string;
    createdAt: Date;
}