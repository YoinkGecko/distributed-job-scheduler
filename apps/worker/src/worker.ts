import redis from "@scheduler/redis";
import {
  JobRepository,
  WorkflowRepository,
  WorkflowJobRepository,
  WorkflowDependencyRepository,
  WorkflowJobExecutionRepository,
  OutboxRepository,
} from "@scheduler/database";
import { JobStatus, AggregateType } from "@scheduler/types";
import { WorkflowDependencyService, OutboxService } from "@scheduler/api";

const workflowRepository = new WorkflowRepository();
const workflowJobRepository = new WorkflowJobRepository();
const workflowDependencyRepository = new WorkflowDependencyRepository();
const workflowJobExecutionRepository = new WorkflowJobExecutionRepository();
const outboxRepository = new OutboxRepository();
const outboxService = new OutboxService(outboxRepository);
const workflowDependencyService = new WorkflowDependencyService(
  workflowRepository,
  workflowJobRepository,
  workflowDependencyRepository,
  workflowJobExecutionRepository,
  outboxService,
);

const STREAM_KEY = "jobs-stream";
const GROUP_NAME = "workers";
const CONSUMER_NAME = process.env.CONSUMER_NAME!;

const jobRepository = new JobRepository();

async function startWorker() {
  try {
    await redis.xgroup("CREATE", STREAM_KEY, GROUP_NAME, "0", "MKSTREAM");

    console.log(`[${CONSUMER_NAME}] Consumer Group "${GROUP_NAME}" created.`);
  } catch (error: any) {
    if (error.message.includes("BUSYGROUP")) {
      console.log(
        `[${CONSUMER_NAME}] Consumer Group "${GROUP_NAME}" already exists.`,
      );
    } else {
      console.error(error);
    }
  }

  console.log(`[${CONSUMER_NAME}] Waiting for jobs on "${STREAM_KEY}"...\n`);

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

      if (!response) continue;

      const [[, entries]] = response;
      console.log(entries);

      for (const [messageId, fields] of entries) {
        const jobData: Record<string, string> = {};

        for (let i = 0; i < fields.length; i += 2) {
          jobData[fields[i]] = fields[i + 1];
        }

        const entityType = jobData.entityType;
        const entityId = jobData.entityId;

        console.log(`\n[${CONSUMER_NAME}] Received ${entityType}`, entityId);

        const execution = await claimExecution(entityType, entityId);

        if (!execution) {
          console.log(
            `[${CONSUMER_NAME}] ${entityType} ${entityId} already claimed or not PENDING.`,
          );

          await redis.xack(STREAM_KEY, GROUP_NAME, messageId);

          continue;
        }

        let heartbeatInterval: NodeJS.Timeout | undefined;

        try {
          console.log(
            `[${CONSUMER_NAME}] Successfully claimed ${entityType} ${execution.id}`,
          );

          heartbeatInterval = setInterval(async () => {
            try {
              await updateHeartbeat(entityType, execution.id);

              console.log("[Heartbeat] Updated");
            } catch (error) {
              console.error("[Heartbeat] Failed:", error);
            }
          }, 10000);

          console.log(`[${CONSUMER_NAME}] Processing...`);

          await sleep(30000);

          await updateStatus(entityType, execution.id, JobStatus.COMPLETED);

          if (entityType === AggregateType.WORKFLOW_JOB_EXECUTION) {
            await workflowDependencyService.completeWorkflowJobExecution(
              execution.id,
            );
          }

          await redis.xack(STREAM_KEY, GROUP_NAME, messageId);

          console.log(`[${CONSUMER_NAME}] ${entityType} completed.`);
        } catch (error) {
          console.error(error);

          await updateStatus(entityType, execution.id, JobStatus.FAILED);
        } finally {
          if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
          }
        }
      }
    } catch (error) {
      console.error(`[${CONSUMER_NAME}] Stream error:`, error);
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

startWorker();

async function claimExecution(entityType: string, entityId: string) {
  switch (entityType) {
    case AggregateType.JOB:
      return await jobRepository.claimJob(entityId, CONSUMER_NAME);

    case AggregateType.WORKFLOW_JOB_EXECUTION:
      return await workflowJobExecutionRepository.claimJob(
        entityId,
        CONSUMER_NAME,
      );

    default:
      throw new Error(`Unknown entity type: ${entityType}`);
  }
}

async function updateHeartbeat(entityType: string, entityId: string) {
  switch (entityType) {
    case AggregateType.JOB:
      return await jobRepository.updateHeartbeat(entityId);

    case AggregateType.WORKFLOW_JOB_EXECUTION:
      return await workflowJobExecutionRepository.updateHeartbeat(entityId);

    default:
      throw new Error(`Unknown entity type: ${entityType}`);
  }
}

async function updateStatus(
  entityType: string,
  entityId: string,
  status: JobStatus,
) {
  switch (entityType) {
    case AggregateType.JOB:
      return await jobRepository.updateStatus(entityId, status);

    case AggregateType.WORKFLOW_JOB_EXECUTION:
      return await workflowJobExecutionRepository.updateStatus(
        entityId,
        status,
      );

    default:
      throw new Error(`Unknown entity type: ${entityType}`);
  }
}
// console.log("\n\nStream Name:",response[0][0]); //stream name
// console.log("Enteries",response[0][1][0]); //entries
// console.log(response[0][1][0][0]); //job id
// console.log(response[0][1][0][1]); //job fields
