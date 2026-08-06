import { OutboxEvent, JobCreatedEventPayload } from "@scheduler/types";

import { pool,snakeToCamel } from "@scheduler/database";

export class OutboxPublisherRepository {
  async findUnpublishedEvents( limit: number,): Promise<OutboxEvent<unknown>[]> {
    const query = `
        SELECT *
        FROM outbox_events
        WHERE published = FALSE
        ORDER BY created_at
        LIMIT $1;
    `;

    const result = await pool.query(query, [limit]);

    return snakeToCamel(result.rows) as OutboxEvent<unknown>[];
  }

  async markPublished(eventId: string): Promise<void> {
    const query = `
      UPDATE outbox_events
      SET
        published = TRUE,
        published_at = NOW()
      WHERE id = $1;
    `;

    await pool.query(query, [eventId]);
  }
}
