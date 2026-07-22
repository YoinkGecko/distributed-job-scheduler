import redis from "../redis/client.js";

export class RedisPublisher {
  async publish(jobId: string) {
    const streamId = await redis.xadd("jobs-stream", "*", "jobId", jobId);
    console.log("Stream Id:",streamId," for Job ",jobId,'\n\n');
  }
}
