import redis from "./redis/client.js";

const STREAM_KEY = "jobs-stream";
const GROUP_NAME = "workers";
const CONSUMER_NAME = "worker-1";

async function startWorker() {
  // 1. Create Consumer Group if it doesn't exist yet
  try {
    await redis.xgroup("CREATE", STREAM_KEY, GROUP_NAME, "0", "MKSTREAM");
    console.log(`[Worker] Consumer Group "${GROUP_NAME}" created.`);
  } catch (err: any) {
    if (err.message.includes("BUSYGROUP")) {
      console.log(`[Worker] Consumer Group "${GROUP_NAME}" already exists.`);
    } else {
      console.error("[Worker] Error creating consumer group:", err);
    }
  }

  console.log(`[Worker] Waiting for jobs on "${STREAM_KEY}"...`);

  // 2. Continuous Processing Loop
  while (true) {
    try {
      // XREADGROUP blocks until a new message (">") arrives
      const response = (await redis.xreadgroup(
        "GROUP",
        GROUP_NAME,
        CONSUMER_NAME,
        "COUNT",
        1,
        "BLOCK",
        0, // Wait indefinitely for new entries
        "STREAMS",
        STREAM_KEY,
        ">"
      )) as [string, [string, string[]][]][];

      if (!response) continue;

      // Extract stream entries array
      const [[, entries]] = response;

      for (const [messageId, fields] of entries) {
        // Parse key-value array into a JavaScript object
        const jobData: Record<string, string> = {};
        for (let i = 0; i < fields.length; i += 2) {
          jobData[fields[i]] = fields[i + 1];
        }

        console.log(`\n[Worker] Processing Job ${messageId}:`, jobData);

        // 3. Acknowledge success to Redis so the job is marked complete
        await redis.xack(STREAM_KEY, GROUP_NAME, messageId);
        console.log(`[Worker] Job ${messageId} ACKNOWLEDGED and completed.`);
      }
    } catch (error) {
      console.error("[Worker] Error processing job from stream:", error);
    }
  }
}

startWorker();