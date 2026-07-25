import { OutboxRepository,PoolClient } from "@scheduler/database";
import {JobCreatedEventPayload,AggregateType,OutboxEventType} from "@scheduler/types";

export class OutboxService {
  constructor(private readonly outboxRepository: OutboxRepository) {}

  async createEvent(payload: JobCreatedEventPayload,client: PoolClient) {
    const event = {
      id: crypto.randomUUID(),
      aggregateType: AggregateType.JOB,
      aggregateId: payload.jobId,
      eventType: OutboxEventType.JOB_CREATED,
      payload,
    };
    await this.outboxRepository.createEvent(event,client);
  }
}
