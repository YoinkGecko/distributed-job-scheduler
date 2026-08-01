CREATE TABLE workflow_jobs (
    id UUID PRIMARY KEY,
    workflow_id UUID NOT NULL,
    job_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_workflow 
        FOREIGN KEY (workflow_id) 
        REFERENCES workflows(id) 
        ON DELETE CASCADE,

    CONSTRAINT fk_job 
        FOREIGN KEY (job_id) 
        REFERENCES jobs(id) 
        ON DELETE CASCADE
);

CREATE INDEX idx_workflow_jobs_workflow_id ON workflow_jobs(workflow_id);