import redis from "@scheduler/redis";
import { JobRepository } from "@scheduler/database";
import { JobStatus } from "@scheduler/types";
import { isHeartbeatStale } from "./utility/utilityFunction.js";

const STREAM_KEY = "jobs-stream";
const GROUP_NAME = "workers";
const CONSUMER_NAME = process.env.CONSUMER_NAME!;

const jobRepository = new JobRepository();

async function startRecoveryWorker() {
  console.log(`[${CONSUMER_NAME}] Started`);

  while (true) {
    try {
      const response = (await redis.xautoclaim(
        STREAM_KEY,
        GROUP_NAME,
        CONSUMER_NAME,
        30000,
        "0-0", 
        "COUNT",
        10,
      )) as [string, Array<[string, string[]]>];

      const [, entries] = response;

      for (const [messageId, fields] of entries) {
        const jobData: Record<string, string> = {};

        for (let i = 0; i < fields.length; i += 2) {
          jobData[fields[i]] = fields[i + 1];
        }

        console.log(jobData); //jobData = { entityType: 'JOB', entityId: 'fbcde124-17c2-4f76-9623-a8e0e5b073ed' }
        if (!jobData.entityId) {
          console.log(
            `[${CONSUMER_NAME}] Missing entityId in message ${messageId}`,
          );
          await redis.xack(STREAM_KEY, GROUP_NAME, messageId);
          continue;
        }

        const job = await jobRepository.findById(jobData.entityId);

        if (!job) {
          console.log("Job not found in database");
          await redis.xack(STREAM_KEY, GROUP_NAME, messageId);
          continue;
        }

        if (!isHeartbeatStale(job, 30000)) {
          console.log(`[${CONSUMER_NAME}] Job ${job.id} is healthy`);
          continue;
        }

        if (
          job.status === JobStatus.COMPLETED ||
          job.status === JobStatus.DEAD
        ) {
          await redis.xack(STREAM_KEY, GROUP_NAME, messageId);
          console.log(
            `[${CONSUMER_NAME}] Job ${job.id} is already ${job.status}. ACKing and skipping.`,
          );
          continue;
        }

        console.log(
          `[${CONSUMER_NAME}] Job ${job.id} - RetryCount: ${job.retryCount}, MaxRetries: ${job.maxRetries}`,
        );

        if (job.retryCount >= job.maxRetries) {
          await jobRepository.updateStatus(job.id, JobStatus.DEAD);
          await redis.xack(STREAM_KEY, GROUP_NAME, messageId);

          console.log(`[${CONSUMER_NAME}] Job ${job.id} moved to DEAD`);
          continue;
        }

        // Increment retry count in DB and reset status to PENDING
        await jobRepository.prepareForRetry(job.id);

        // ACK the old stuck message from PEL before issuing a new XADD
        await redis.xack(STREAM_KEY, GROUP_NAME, messageId);
        if (jobData.entityType == "JOB") {
          await redis.xadd(
            STREAM_KEY,
            "*",
            "entityType",
            "JOB",
            "entityId",
            job.id,
          );
        }

        console.log(`[${CONSUMER_NAME}] Requeued Job ${job.id}`);
      }
    } catch (err) {
      // FIX 4: Protect loop from unhandled crashes
      console.error("[${CONSUMER_NAME}] Error processing recovery loop:", err);
    }

    console.log("\n");
    await sleep(5000);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

startRecoveryWorker();
