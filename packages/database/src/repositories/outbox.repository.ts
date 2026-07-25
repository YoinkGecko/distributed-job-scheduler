import { JobCreatedEvent } from "@scheduler/types";
import {PoolClient} from "@scheduler/database"
import { pool } from "../../pool.js";

export class OutboxRepository {
  async createEvent(event: JobCreatedEvent,client: PoolClient): Promise<Boolean> {
    const result = await client.query("a");
    return true;
  }
}
