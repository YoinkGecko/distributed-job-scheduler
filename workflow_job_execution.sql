CREATE TABLE workflow_job_executions (
    id UUID PRIMARY KEY,
    workflow_execution_id UUID NOT NULL REFERENCES workflow_executions(id) ON DELETE CASCADE,
    workflow_job_id UUID NOT NULL REFERENCES workflow_jobs(id) ON DELETE CASCADE,
    
    type TEXT NOT NULL,
    payload JSONB NOT NULL,

    status job_status NOT NULL,

    priority INTEGER NOT NULL,

    scheduled_at TIMESTAMPTZ NOT NULL,

    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,

    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    retry_count INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 3,

    assigned_worker TEXT,
    heartbeat_at TIMESTAMPTZ,
    lock_expires_at TIMESTAMPTZ,

    last_error TEXT,
    
    UNIQUE(workflow_execution_id, workflow_job_id)
);

CREATE INDEX idx_wje_status_priority_scheduled 
ON workflow_job_executions (status, priority DESC, scheduled_at)
WHERE status = 'PENDING';

CREATE INDEX idx_wje_status_lock_expires 
ON workflow_job_executions (status, lock_expires_at)
WHERE status = 'RUNNING';

CREATE INDEX idx_wje_workflow_execution_id 
ON workflow_job_executions (workflow_execution_id);

CREATE INDEX idx_wje_workflow_job_id 
ON workflow_job_executions (workflow_job_id);

CREATE INDEX idx_wje_worker_heartbeat 
ON workflow_job_executions (assigned_worker, heartbeat_at)
WHERE status = 'RUNNING';