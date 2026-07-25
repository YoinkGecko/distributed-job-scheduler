# Distributed Job Scheduler

A work-in-progress distributed job scheduler built with Node.js, TypeScript, PostgreSQL, and Redis. This repository is designed to manage job creation, persistence, event outbox writing, and worker processing using Redis Streams and recovery logic.

> **Author:** Kartikeya Sharma
> **Status:** Work in progress, open for contribution.

## Project Overview

This project aims to provide a resilient scheduler for background jobs. The current implementation includes:

- API service for creating jobs
- PostgreSQL persistence for jobs and outbox events
- Redis Streams for worker processing
- Worker process for consuming jobs and updating job status
- Recovery worker for handling stale or stuck jobs

## Architecture

The repository is organized as a pnpm workspace with these main apps and packages:

- `apps/api` - API service for job creation and HTTP endpoints
- `apps/worker` - worker process that consumes jobs from Redis
- `packages/database` - database repository layer and PostgreSQL pool
- `packages/redis` - Redis client wrapper using `ioredis`
- `packages/types` - shared TypeScript types and enums

### Data flow

1. Client calls API endpoint `POST /jobs`
2. API validates the payload and creates a `Job` record in PostgreSQL
3. API writes an `outbox_events` record in the database
4. Job workers consume jobs from Redis Streams
5. Workers claim jobs and update job status to `RUNNING`
6. Workers simulate processing and then mark jobs as `COMPLETED` or `FAILED`
7. A recovery worker periodically checks for stale jobs and retries or marks them `DEAD`

## Database schema

The `sql.sql` file defines two tables:

- `jobs`
  - Stores job metadata and execution state
- `outbox_events`
  - Stores outbox events for later publishing or integration

Key table columns:

- `jobs.id` - UUID primary key
- `jobs.status` - `PENDING`, `RUNNING`, `COMPLETED`, `FAILED`, `DEAD`
- `jobs.retry_count`, `jobs.max_retries`
- `outbox_events.aggregate_type` - event source type
- `outbox_events.payload` - JSON payload for the event

## Key files and flows

### API app

#### `apps/api/src/app.ts`

- Creates the Express app
- Configures JSON body parsing
- Sets up `/health` endpoint
- Mounts `jobRoutes` on `/jobs`

#### `apps/api/src/server.ts`

- Imports the Express app
- Starts HTTP server on port `3000`

#### `apps/api/src/routes/job.routes.ts`

- Defines route: `POST /jobs`
- Uses `createJob` controller for job creation

#### `apps/api/src/controllers/job.controller.ts`

- Instantiates `JobRepository`, `OutboxRepository`, `OutboxService`, and `JobService`
- Exposes `createJob(req, res)`:
  - Calls `jobService.createJob(req.body)`
  - Returns created job JSON response

### API services

#### `apps/api/src/services/job.service.ts`

- `JobService` orchestrates job creation
- `createJob(input: CreateJobInput)` does:
  - Create a unique job payload
  - Determine retry limits from priority
  - Begin database transaction
  - Persist job with `jobRepository.createJob(job, client)`
  - Create outbox event via `outboxService.createEvent(outboxPayload, client)`
  - Commit or rollback transaction

- `maxRetries(priority: JobPriority)` returns retry limits:
  - `NORMAL` = 3
  - `HIGH` = 5
  - `CRITICAL` = 10

#### `apps/api/src/services/outbox.service.ts`

- `OutboxService` creates an `OutboxEvent`
- Uses `crypto.randomUUID()` for event id
- Calls `outboxRepository.createEvent(event, client)`

#### `apps/api/src/publishers/redis.publisher.ts`

- `RedisPublisher.publish(jobId)` adds a job message to Redis Stream `jobs-stream`
- This file is a publisher helper but is not currently wired into the API flow, making it a good contribution area.

### Worker app

#### `apps/worker/src/worker.ts`

- Creates Redis consumer group `workers` for `jobs-stream`
- Loops forever with `xreadgroup` to read pending jobs
- Parses Redis stream fields into `jobData`
- `jobRepository.claimJob(jobData.jobId, CONSUMER_NAME)` attempts to claim the job
- On success:
  - Starts a heartbeat timer and updates job `heartbeat_at`
  - Simulates work with `sleep(30000)`
  - Updates `JobStatus.COMPLETED`
  - Acknowledges stream message with `xack`
- On failure:
  - Updates job `JobStatus.FAILED`
  - Clears heartbeat timer

#### `apps/worker/src/recovery.worker.ts`

- Periodically checks pending and stuck stream entries with `xautoclaim`
- Parses stream payload and loads the job from database
- Skips jobs already `COMPLETED` or `DEAD`
- Uses `jobRepository.prepareForRetry(job.id)` for retryable jobs
- If retry count exceeds max retries, sets job `DEAD`
- Re-adds the job to Redis Stream with `xadd`

#### `apps/worker/src/utility/utilityFunction.ts`

- Exports `isHeartbeatStale(job, threshold)`
- Used by recovery worker to decide when a job is unhealthy or stuck

### Database package

#### `packages/database/pool.ts`

- Creates a PostgreSQL pool using `pg`
- Loads environment variables with `dotenv`

#### `packages/database/src/repositories/job.repository.ts`

- `create(job: Job)` and `createJob(job: Job, client: PoolClient)` insert a job row
- `findById(jobId)` returns a job record or `null`
- `updateStatus(jobId, status)` updates a job's status
- `updateHeartbeat(jobId)` refreshes `heartbeat_at`
- `incrementRetryCount(jobId)` increments retry count
- `claimJob(jobId, workerId)` safely claims a PENDING job and sets it to RUNNING
- `prepareForRetry(jobId)` resets a job to PENDING and clears assignment

#### `packages/database/src/repositories/outbox.repository.ts`

- `createEvent(event, client)` inserts an outbox event row

#### `packages/database/src/utility/job.mapper.ts`

- Converts PostgreSQL snake_case fields to camelCase
- Used by repository query results

### Redis package

#### `packages/redis/src/client.ts`

- Connects to Redis using environment variables
- Logs connection success and errors
- Exports default Redis client instance

### Shared types package

#### `packages/types/src/create-job-input.ts`

- Defines `CreateJobInput`:
  - `type`: `JobType`
  - `payload`: JSON body
  - `priority?`: `JobPriority`
  - `scheduledAt?`: `Date`

#### `packages/types/src/job.ts`

- Defines `JobStatus`, `JobPriority`, `JobType`
- Defines `Job` interface with all scheduler fields

#### `packages/types/src/outbox.ts`

- Defines `OutboxEventType`, `AggregateType`
- Defines `JobCreatedEventPayload`
- Defines generic `OutboxEvent<T>`

## Getting started

### Prerequisites

- Node.js 20+
- pnpm
- PostgreSQL
- Redis

### Install dependencies

```bash
pnpm install
```

### Environment variables

Create a `.env` file with:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=your_user
DB_PASSWORD=your_password
DB_NAME=your_db
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
CONSUMER_NAME=worker-1
```

### Database setup

Run the SQL in `sql.sql` to create the `jobs` and `outbox_events` tables.

### Run services

Start the API:

```bash
pnpm --filter @scheduler/api dev
```

Start a worker:

```bash
pnpm --filter @scheduler/worker dev
```

Start the recovery worker:

```bash
pnpm --filter @scheduler/worker rw
```

Or run both services together from the root workspace:

```bash
pnpm dev
```

## How to use

Send a POST request to create a job:

```bash
curl -X POST http://localhost:3000/jobs \
  -H 'Content-Type: application/json' \
  -d '{
    "type": "EMAIL",
    "payload": {"to": "user@example.com", "subject": "Hello"},
    "priority": 5
  }'
```

## Contribution guide

This project is open for contributions and improvement. Suggested work items:

- Wire `RedisPublisher` into the API job creation flow
- Add validation and request schema enforcement
- Add outbox event dispatcher to publish `outbox_events`
- Improve worker retry and failure handling
- Add tests for the API, worker, and repository layers
- Add documentation for package publishing and workspace usage

## Notes and current WIP areas

- The API currently writes job and outbox records in a transaction
- Redis `jobs-stream` publishing is available in `RedisPublisher`, but not fully connected in the current flow
- The recovery worker can detect stale jobs and requeue them
- The current worker simulates processing using `sleep(30000)` and should be replaced with real job execution logic

## Contact

For issues, ideas, or pull requests, open a GitHub issue or PR on this repository.

---

Thank you for contributing to this distributed job scheduler. This repo is intended to grow into a production-capable scheduler with guaranteed delivery, retries, and event-driven processing.
