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
  last_error TEXT
);