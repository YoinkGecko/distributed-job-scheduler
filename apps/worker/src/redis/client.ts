import { Redis } from "ioredis";
import dotenv from "dotenv";

dotenv.config();

const redis = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
});

redis.on("connect", () => {
  console.log("[Redis] Connected successfully.");
});

redis.on("error", (err) => {
  console.error("[Redis] Connection error:", err.message);
});

export default redis;