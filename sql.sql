CREATE TABLE jobs (
    id UUID PRIMARY KEY,

    type TEXT NOT NULL,

    payload JSONB NOT NULL,

    status TEXT NOT NULL,

    priority INTEGER NOT NULL,

    scheduledAt TIMESTAMPTZ NOT NULL,

    createdAt TIMESTAMPTZ NOT NULL,

    updatedAt TIMESTAMPTZ NOT NULL,

    startedAt TIMESTAMPTZ,

    completedAt TIMESTAMPTZ,

    retryCount INTEGER NOT NULL,

    maxRetries INTEGER NOT NULL,

    assignedWorker TEXT,

    heartbeatAt TIMESTAMPTZ,

    lockExpiresAt TIMESTAMPTZ,

    lastError TEXT
);