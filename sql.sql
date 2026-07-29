CREATE TYPE workflow_status AS ENUM (
    'PENDING',
    'RUNNING',
    'COMPLETED',
    'FAILED',
    'CANCELLED'
);

CREATE TYPE job_status AS ENUM (
'WAITING',
'PENDING',
'RUNNING',
'COMPLETED',
'FAILED',
'DEAD'
);

CREATE TYPE dependency_policy AS ENUM (
    'ALL',
    'ANY'
);

CREATE TYPE workflow_execution_status AS ENUM (
    'PENDING',
    'RUNNING',
    'COMPLETED',
    'FAILED',
    'CANCELLED'
);

CREATE TABLE jobs (
  id UUID PRIMARY KEY,
  type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL,
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
  dependency_policy dependency_policy NOT NULL DEFAULT 'ALL'
);


CREATE TABLE outbox_events (
    id UUID PRIMARY KEY, -- the table rows unique id not job id!!
    aggregate_type VARCHAR(100) NOT NULL, --example JOB,PAYMENT,USER,ORDER for which we are pulishing event
    aggregate_id UUID NOT NULL, -- job.id
    event_type VARCHAR(100) NOT NULL, --JOB_CREATED,JOB_CANCELLED,JOB_FAILED,JOB_COMPLETED
    payload JSONB NOT NULL, --This is the actual event data. 
    --{"jobId": "9c2b87b3-2c3d-4baf-b3d1-8f2d44b5f123","type": "SEND_EMAIL","priority": 5,"scheduledAt": "2026-07-26T10:00:00Z"}
    published BOOLEAN NOT NULL DEFAULT FALSE, --is it published?
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), 
    published_at TIMESTAMPTZ 
);

CREATE TABLE workflows (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    status workflow_status NOT NULL DEFAULT 'RUNNING',
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

CREATE TABLE workflow_jobs (
    id UUID PRIMARY KEY,
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(workflow_id, job_id)
);


--This represents one run of a workflow.
CREATE TABLE workflow_executions (
    id UUID PRIMARY KEY,
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    status workflow_execution_status NOT NULL DEFAULT 'PENDING',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

--This represents the execution of one workflow job inside one workflow execution.
CREATE TABLE workflow_job_executions (
    id UUID PRIMARY KEY,
    workflow_execution_id UUID NOT NULL REFERENCES workflow_executions(id) ON DELETE CASCADE,
    workflow_job_id UUID NOT NULL REFERENCES workflow_jobs(id) ON DELETE CASCADE,
    status job_status NOT NULL DEFAULT 'WAITING',
    retry_count INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,

    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(workflow_execution_id, workflow_job_id)
);

CREATE TABLE job_dependencies (
    id UUID PRIMARY KEY,
    parent_workflow_job_id UUID NOT NULL REFERENCES workflow_jobs(id) ON DELETE CASCADE,
    child_workflow_job_id UUID NOT NULL REFERENCES workflow_jobs(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(parent_workflow_job_id, child_workflow_job_id),
    CHECK(parent_workflow_job_id <> child_workflow_job_id)
);

CREATE INDEX idx_parent_workflow_job
ON job_dependencies(parent_workflow_job_id);

CREATE INDEX idx_child_workflow_job
ON job_dependencies(child_workflow_job_id);

CREATE INDEX idx_jobs_status
ON jobs(status);

CREATE INDEX idx_workflow_jobs_workflow_id
ON workflow_jobs(workflow_id);

CREATE INDEX idx_workflow_jobs_job_id
ON workflow_jobs(job_id);

CREATE INDEX idx_workflow_executions_workflow_id
ON workflow_executions(workflow_id);

CREATE INDEX idx_workflow_executions_status
ON workflow_executions(status);


CREATE INDEX idx_workflow_job_execution_execution
ON workflow_job_executions(workflow_execution_id);

CREATE INDEX idx_workflow_job_execution_workflow_job
ON workflow_job_executions(workflow_job_id);

CREATE INDEX idx_workflow_job_execution_status
ON workflow_job_executions(status);