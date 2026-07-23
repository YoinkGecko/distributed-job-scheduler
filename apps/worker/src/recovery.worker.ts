import redis from "@scheduler/redis";
import { JobRepository } from "@scheduler/database";
import { JobStatus } from "@scheduler/types";
import {snakeToCamel} from "@scheduler/database";

const STREAM_KEY = "jobs-stream";
const GROUP_NAME = "workers";
const CONSUMER_NAME = "recovery-worker";

const jobRepository = new JobRepository();

async function startRecoveryWorker() {
  console.log("[Recovery Worker] Started");

  while (true) {
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
    console.log("Enteries",entries);

    for (const [messageId, fields] of entries) {
      const jobData: Record<string, string> = {};

      for (let i = 0; i < fields.length; i += 2) {
        jobData[fields[i]] = fields[i + 1];
      }

      console.log(jobData);

      const dbJob = await jobRepository.findById(jobData.jobId);
      const job = snakeToCamel(dbJob);
      
      

      if (!job) {
        console.log("Job not found");

        await redis.xack(STREAM_KEY, GROUP_NAME, messageId);

        continue;
      }

      if (job.retryCount > job.maxRetries) {
        await jobRepository.updateStatus(job.id, JobStatus.DEAD);

        await redis.xack(STREAM_KEY, GROUP_NAME, messageId);

        console.log("Job moved to DEAD");

        continue;
      }

      await jobRepository.incrementRetryCount(job.id);

      await jobRepository.updateStatus(job.id, JobStatus.PENDING);

      await redis.xack(STREAM_KEY, GROUP_NAME, messageId);

      await redis.xadd(STREAM_KEY, "*", "jobId", job.id);

      console.log("Job requeued");

      
    }
    console.log("\n");

    await sleep(5000);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

startRecoveryWorker();
