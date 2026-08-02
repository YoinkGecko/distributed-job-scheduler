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


CREATE TABLE workflow_job_dependencies (
    id UUID PRIMARY KEY,
    parent_workflow_job_id UUID NOT NULL REFERENCES workflow_jobs(id) ON DELETE CASCADE,
    child_workflow_job_id UUID NOT NULL REFERENCES workflow_jobs(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(parent_workflow_job_id, child_workflow_job_id),
    CHECK (parent_workflow_job_id <> child_workflow_job_id)
);

CREATE INDEX idx_workflow_job_dependencies_parent
ON workflow_job_dependencies(parent_workflow_job_id);

CREATE INDEX idx_workflow_job_dependencies_child
ON workflow_job_dependencies(child_workflow_job_id);