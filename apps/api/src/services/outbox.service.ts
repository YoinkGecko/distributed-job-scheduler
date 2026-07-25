import { OutboxRepository,PoolClient } from "@scheduler/database";
import {JobCreatedEvent,AggregateType} from "@scheduler/types";

export class OutboxService {
  constructor(private readonly outboxRepository: OutboxRepository) {}

  async createEvent(event: JobCreatedEvent,client: PoolClient) {
    const Eventdata = {
      id : crypto.randomUUID,
      aggregate_type: "JOB",
      aggregate_id:event.jobId,
      event_type:"JOB_CREATED",
      payload:"Asdf",
    }
    await this.outboxRepository.createEvent(event,client);
  }
}
