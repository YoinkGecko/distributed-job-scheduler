import { OutboxEvent } from "@scheduler/types";
import { PoolClient } from "pg";
import { pool } from "@scheduler/database";

export class OutboxRepository {
  async createEvent<T>(
    event: OutboxEvent<T>,
    client?: PoolClient,
  ): Promise<void> {
    const executer = client ?? pool;

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
