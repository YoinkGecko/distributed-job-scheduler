export enum OutboxEventType {
    JOB_CREATED = "JOB_CREATED"
}

export enum AggregateType {
    JOB = "JOB"
}

export interface JobCreatedEventPayload { // this is the oubox row payload
    jobId: string;
    type: string;
    priority: number;
    scheduledAt: Date ;
}

export interface OutboxEvent<T> { //T means: the payload can be any event.
    id: string;
    aggregateType: AggregateType;
    aggregateId: string;
    eventType: OutboxEventType;
    payload: T;
}