import { OutboxEvent, JobCreatedEventPayload } from "@scheduler/types";
import { PoolClient } from "pg";

export class OutboxRepository {

  async createEvent( event: OutboxEvent<JobCreatedEventPayload>, client: PoolClient): Promise<void> {
    
    const insertEventQuery = `
      INSERT INTO outbox_events (
        id,
        aggregate_type,
        aggregate_id,
        event_type,
        payload
      )
      VALUES (
        $1, $2, $3, $4, $5
      );
    `;

    const values = [
      event.id,
      event.aggregateType,
      event.aggregateId,
      event.eventType,
      event.payload, 
    ];

    await client.query(insertEventQuery, values);

  }
}
