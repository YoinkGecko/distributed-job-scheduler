import { OutboxRepository, PoolClient } from "@scheduler/database";
import {
  JobCreatedEventPayload,
  AggregateType,
  OutboxEventType,
  WorkflowJobExecutionCreatedEventPayload
} from "@scheduler/types";

export class OutboxService {
  constructor(private readonly outboxRepository: OutboxRepository) {}

  async createEvent(payload: JobCreatedEventPayload, client: PoolClient) {
    const event = {
      id: crypto.randomUUID(),
      aggregateType: AggregateType.JOB,
      aggregateId: payload.jobId,
      eventType: OutboxEventType.JOB_CREATED,
      payload,
    };
    await this.outboxRepository.createEvent(event, client);
  }

  async createWorkflowJobExecutionEvent(
    payload: WorkflowJobExecutionCreatedEventPayload,
    client: PoolClient,
  ) {
    const event = {
      id: crypto.randomUUID(),
      aggregateType: AggregateType.WORKFLOW_JOB_EXECUTION,
      aggregateId: payload.workflowJobExecutionId,
      eventType: OutboxEventType.WORKFLOW_JOB_EXECUTION_CREATED,
      payload,
    };

    await this.outboxRepository.createEvent(event, client);
  }
}
