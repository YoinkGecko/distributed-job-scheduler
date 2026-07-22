import redis from "../redis/client.js";


export class RedisPublisher {

async publish(jobId: string) {
   await redis.set("id",jobId);
}

}