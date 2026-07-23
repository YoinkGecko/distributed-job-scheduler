
export function snakeToCamel(job: any) {
  return {
    id: job.id,
    type: job.type,
    payload: job.payload,

    status: job.status,
    priority: job.priority,

    scheduledAt: job.scheduled_at,

    createdAt: job.created_at,
    updatedAt: job.updated_at,
    startedAt: job.started_at,
    completedAt: job.completed_at,

    retryCount: job.retry_count,
    maxRetries: job.max_retries,

    assignedWorker: job.assigned_worker,
    heartbeatAt: job.heartbeat_at,
    lockExpiresAt: job.lockExpires_at,

    lastError: job.last_error,
  };
}
