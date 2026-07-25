export enum OutboxEventType {
    JOB_CREATED = "JOB_CREATED"
}

export enum AggregateType {
    JOB = "JOB"
}

export interface JobCreatedEvent {
    jobId: string;
    type: string;
    priority: number;
}