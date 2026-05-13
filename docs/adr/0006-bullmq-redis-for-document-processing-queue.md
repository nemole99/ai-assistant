# 6. BullMQ + Redis for Document Processing Queue

Date: 2026-05-13
Status: Accepted

## Context

Documents uploaded by Admin need asynchronous processing (PDF → Markdown conversion via MarkItDown). We needed a job queue. The obvious choice was pg-boss — it runs on our existing Postgres and requires zero new infrastructure. Instead, we chose BullMQ backed by Redis.

## Decision

Use BullMQ + Redis as the job queue for document processing, running in a separate worker process (`apps/server/src/worker.ts`) from the Hono API server.

## Why not pg-boss?

pg-boss would avoid adding Redis, but BullMQ gives us: reliable retry with exponential backoff, built-in concurrency control, a mature dashboard (Bull Board) for monitoring jobs, and a much larger community. Document processing is the first queue use case, but we anticipate more (notifications, scheduled tasks). Investing in Redis now avoids a painful migration later when pg-boss's limitations surface. Redis also opens the door for caching and rate limiting if needed.

## Consequences

- Redis is now a required infrastructure dependency (added to Docker Compose and env config)
- Worker is a separate Bun process sharing the same codebase, deployed as its own service
- If Redis goes down, document processing pauses but the API server remains fully operational
