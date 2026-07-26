import redis from "@scheduler/redis";
import { OutboxPublisherRepository } from "@scheduler/database";
import { OutboxEvent, JobCreatedEventPayload } from "@scheduler/types";
import { sleep } from "./utils/sleep";

const STREAM_KEY = "jobs-stream";

export class OutboxPublisher {
  constructor(private readonly repository = new OutboxPublisherRepository()) {}

  async start() {
    console.log("Outbox Publisher Started");

    while (true) {
      await this.publishPendingEvents();

      await sleep(1000);
    }
  }

  private async publishPendingEvents(): Promise<void> {
    const events = await this.repository.findUnpublishedEvents(100); //Batch size of 100

    if (events.length === 0) {
      return;
    }

    for (const event of events) {
      try {
        await this.publishEvent(event);
      } catch (err) {
        console.error(`Failed to publish event ${event.id}`, err);
      }
    }
  }

  private async publishEvent(
    event: OutboxEvent<JobCreatedEventPayload>,
  ): Promise<void> {
    await redis.xadd(STREAM_KEY, "*", "jobId", event.payload.jobId);

    await this.repository.markPublished(event.id);

    console.log(`Published Event=${event.id} Job=${event.payload.jobId}`);
  }
}
