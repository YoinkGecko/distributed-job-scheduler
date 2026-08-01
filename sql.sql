CREATE TYPE job_status AS ENUM (
'WAITING',
'PENDING',
'RUNNING',
'COMPLETED',
'FAILED',
'DEAD'
);

CREATE TABLE jobs (
  id UUID PRIMARY KEY,
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
  last_error TEXT
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

CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_id ON jobs(id);