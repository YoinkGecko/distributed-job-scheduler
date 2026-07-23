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
  } catch (err: any) {
    if (err.message.includes("BUSYGROUP")) {
      console.log(`[Worker] Consumer Group "${GROUP_NAME}" already exists.`);
    } else {
      console.error("[Worker] Error creating consumer group:", err);
    }
  }

  console.log(`[Worker] Waiting for jobs on "${STREAM_KEY}"...\n\n`);

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
        ">",
      )) as [string, [string, string[]][]][];

      // console.log("\n\nStream Name:",response[0][0]); //stream name
      // console.log("Enteries",response[0][1][0]); //entries
      // console.log(response[0][1][0][0]); //job id
      // console.log(response[0][1][0][1]); //job fields

      if (!response) continue;

      const [[, entries]] = response;

      for (const [messageId, fields] of entries) {
        const jobData: Record<string, string> = {};
        for (let i = 0; i < fields.length; i += 2) {
          jobData[fields[i]] = fields[i + 1];
        }

        console.log(`\n[Worker] Processing Job ${messageId}:`, jobData);

        const job = await jobRepository.findById(jobData.jobId);

        if (job) {
          await jobRepository.updateStatus(jobData.jobId, JobStatus.RUNNING);
          try {
            console.log("Working", job); // work
          } catch (err) {
            await jobRepository.updateStatus(jobData.jobId, JobStatus.FAILED);
            continue;
          }
          await jobRepository.updateStatus(jobData.jobId, JobStatus.COMPLETED);
          //await redis.xack(STREAM_KEY, GROUP_NAME, messageId);
          console.log(`[Worker] Job ${messageId} ACKNOWLEDGED and completed.`);
        } else {
          console.error("Job not found");
          continue;
        }
      }
    } catch (error) {
      console.error("[Worker] Error processing job from stream:", error);
    }
  }
}

startWorker();
