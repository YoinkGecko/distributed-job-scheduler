import redis from "@scheduler/redis";
import { JobRepository } from "@scheduler/database";
import { JobStatus } from "@scheduler/types";
import { snakeToCamel } from "@scheduler/database";

const STREAM_KEY = "jobs-stream";
const GROUP_NAME = "workers";
const CONSUMER_NAME = "recovery-worker";

const jobRepository = new JobRepository();

async function startRecoveryWorker() {
  console.log("[Recovery Worker] Started");

  while (true) {
    try {
      const response = (await redis.xautoclaim(
        STREAM_KEY,
        GROUP_NAME,
        CONSUMER_NAME,
        30000,
        "0-0", // Kept at "0-0"
        "COUNT",
        10,
      )) as [string, Array<[string, string[]]>];

      const [, entries] = response;

      console.log("Entries", entries);

      for (const [messageId, fields] of entries) {
        const jobData: Record<string, string> = {};

        for (let i = 0; i < fields.length; i += 2) {
          jobData[fields[i]] = fields[i + 1];
        }

        console.log(jobData);

        // FIX 1: Safeguard against malformed stream payloads without a jobId
        if (!jobData.jobId) {
          console.log(`[Recovery Worker] Missing jobId in message ${messageId}`);
          await redis.xack(STREAM_KEY, GROUP_NAME, messageId);
          continue;
        }

        const dbJob = await jobRepository.findById(jobData.jobId);

        // FIX 2: Check if dbJob is null BEFORE passing to snakeToCamel!
        // Passing null into snakeToCamel causes undefined properties or runtime errors.
        if (!dbJob) {
          console.log("Job not found in database");
          await redis.xack(STREAM_KEY, GROUP_NAME, messageId);
          continue;
        }

        const job = snakeToCamel(dbJob);

        // FIX 3: Log current retry status and use >= to prevent overshoot beyond maxRetries
        console.log(
          `[Recovery Worker] Job ${job.id} - RetryCount: ${job.retryCount}, MaxRetries: ${job.maxRetries}`
        );

        if (job.retryCount >= job.maxRetries) {
          await jobRepository.updateStatus(job.id, JobStatus.DEAD);
          await redis.xack(STREAM_KEY, GROUP_NAME, messageId);

          console.log("Job moved to DEAD");
          continue;
        }

        // Increment retry count in DB and reset status to PENDING
        await jobRepository.incrementRetryCount(job.id);
        await jobRepository.updateStatus(job.id, JobStatus.PENDING);

        // ACK the old stuck message from PEL before issuing a new XADD
        await redis.xack(STREAM_KEY, GROUP_NAME, messageId);
        await redis.xadd(STREAM_KEY, "*", "jobId", job.id);

        console.log("Job requeued");
      }
    } catch (err) {
      // FIX 4: Protect loop from unhandled crashes
      console.error("[Recovery Worker] Error processing recovery loop:", err);
    }

    console.log("\n");
    await sleep(5000);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

startRecoveryWorker();