CREATE TYPE workflow_execution_status AS ENUM (
    'RUNNING',
    'COMPLETED',
    'FAILED',
    'CANCELLED'
);

CREATE TABLE workflow_executions (
    id UUID PRIMARY KEY,
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    status workflow_execution_status NOT NULL DEFAULT 'RUNNING',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_workflow_execution_workflow
ON workflow_executions(workflow_id);

CREATE INDEX idx_workflow_execution_status
ON workflow_executions(status);