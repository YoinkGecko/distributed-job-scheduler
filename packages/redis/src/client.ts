import { Redis } from "ioredis";
import dotenv from "dotenv";

dotenv.config();

const redis = new Redis({
  host: process.env.REDIS_HOST ,
  port: Number(process.env.REDIS_PORT),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
});

redis.on("connect", () => {
  console.log("[Redis] Connected successfully.");
});

redis.on("error", (err: Error) => {
  console.error("[Redis] Connection error:", err.message);
});

export default redis;