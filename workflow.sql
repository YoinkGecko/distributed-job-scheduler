CREATE TYPE schedule_type AS ENUM (
    'ONCE',
    'INTERVAL',
    'CRON'
);

CREATE TYPE workflow_status AS ENUM (
    'ACTIVE',
    'PAUSED',
    'ARCHIVED'
);

CREATE TABLE workflows (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status workflow_status NOT NULL DEFAULT 'ACTIVE',
    start_at TIMESTAMPTZ,
    end_at TIMESTAMPTZ,
    schedule_type schedule_type NOT NULL,
    schedule_expression TEXT NOT NULL,
    timezone VARCHAR(100) NOT NULL DEFAULT 'UTC',
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);