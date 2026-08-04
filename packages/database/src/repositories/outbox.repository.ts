import { OutboxEvent, JobCreatedEventPayload } from "@scheduler/types";
import { PoolClient} from "pg";
import {pool} from "@scheduler/database";

export class OutboxRepository {

  async createEvent( event: OutboxEvent<JobCreatedEventPayload>, client?: PoolClient): Promise<void> {
    const executer = pool||client;
    
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

    await executer.query(insertEventQuery, values);

  }
}
