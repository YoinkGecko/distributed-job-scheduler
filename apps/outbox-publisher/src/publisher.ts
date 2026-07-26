import redis from "@scheduler/redis";
import { OutboxPublisherRepository } from "@scheduler/database";
import { OutboxEvent, JobCreatedEventPayload } from "@scheduler/types";

const STREAM_KEY = "jobs-stream";

export class OutboxPublisher {
  constructor(private readonly repository = new OutboxPublisherRepository()) {}

  async start() {
    console.log("Outbox Publisher Started");

    while (true) {
      await this.publishPendingEvents();

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  private async publishPendingEvents() {
    const events = await this.repository.findUnpublishedEvents(100);

    if (events.length === 0) {
      return;
    }

    for (const event of events) {
      await this.publishEvent(event);
    }
  }

  private async publishEvent( event: OutboxEvent<JobCreatedEventPayload>): Promise<void> {
    await redis.xadd(STREAM_KEY, "*", "jobId", event.payload.jobId);

    await this.repository.markPublished(event.id);

    console.log(`Published ${event.id}`);
  }
}
