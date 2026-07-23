import { Job } from "@scheduler/types";

export function isHeartbeatStale(job: Job, timeoutMs: number): boolean {
  if (job.heartbeatAt === null) {
    return true;
  }

  return Date.now() - job.heartbeatAt.getTime() > timeoutMs;
}