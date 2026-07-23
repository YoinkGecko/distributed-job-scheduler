import redis from "@scheduler/redis";
import { JobRepository } from "@scheduler/database";
import { JobStatus } from "@scheduler/types";

const STREAM_KEY = "jobs-stream";
const GROUP_NAME = "workers";
const CONSUMER_NAME = "worker-1";

const jobRepository = new JobRepository();

async function startWorker() {
  try {
    await redis.xgroup("CREATE", STREAM_KEY, GROUP_NAME, "0", "MKSTREAM");
    console.log(`[Worker] Consumer Group "${GROUP_NAME}" created.`);
  } catch (error: any) {
    if (error.message.includes("BUSYGROUP")) {
      console.log(`[Worker] Consumer Group "${GROUP_NAME}" already exists.`);
    } else {
      console.error("[Worker] Error creating consumer group:", error);
    }
  }

  console.log(`[Worker] Waiting for jobs on "${STREAM_KEY}"...\n`);

  while (true) {
    try {
      const response = (await redis.xreadgroup(
        "GROUP",
        GROUP_NAME,
        CONSUMER_NAME,
        "COUNT",
        1,
        "BLOCK",
        0,
        "STREAMS",
        STREAM_KEY,
        ">"
      )) as [string, [string, string[]][]][];

      if (!response) continue;

      const [[, entries]] = response;

      for (const [messageId, fields] of entries) {
        const jobData: Record<string, string> = {};

        for (let i = 0; i < fields.length; i += 2) {
          jobData[fields[i]] = fields[i + 1];
        }

        console.log(`\n[Worker] Received Job ${messageId}`, jobData);

        const job = await jobRepository.findById(jobData.jobId);

        if (!job) {
          console.error("[Worker] Job not found.");
          continue;
        }

        let heartbeatInterval: NodeJS.Timeout | undefined;

        try {
          // Job started
          await jobRepository.updateStatus(job.id, JobStatus.RUNNING);

          // Heartbeat every 10 seconds
          heartbeatInterval = setInterval(async () => {
            try {
              await jobRepository.updateHeartbeat(job.id);
              console.log("[Heartbeat] Updated");
            } catch (error) {
              console.error("[Heartbeat] Failed:", error);
            }
          }, 10000);

          // Simulate long-running work
          console.log("[Worker] Processing...");
          await sleep(60000);

          // Job finished successfully
          await jobRepository.updateStatus(job.id, JobStatus.COMPLETED);

          // Tell Redis we're done
          // await redis.xack(STREAM_KEY, GROUP_NAME, messageId);

          console.log(`[Worker] Job ${messageId} completed.`);
        } catch (error) {
          console.error("[Worker] Job failed:", error);

          await jobRepository.updateStatus(job.id, JobStatus.FAILED);
        } finally {
          if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
          }
        }
      }
    } catch (error) {
      console.error("[Worker] Stream error:", error);
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

startWorker();



      // console.log("\n\nStream Name:",response[0][0]); //stream name
      // console.log("Enteries",response[0][1][0]); //entries
      // console.log(response[0][1][0][0]); //job id
      // console.log(response[0][1][0][1]); //job fields