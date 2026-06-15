# Setup Guide

Two ways to run AI Assistant: **Docker** (recommended for production) or **Development** (for local development and contributing).

---

## Option A — Docker (Production)

### Prerequisites

- Docker Engine 24+
- Docker Compose v2+
- Access to an AI provider via GitHub Copilot OAuth

### 1. Clone and configure

```bash
git clone https://github.com/ngocla99/ai-assistant.git
cd ai-assistant
cp .env.docker.example .env.docker
```

Edit `.env.docker` and fill in all required values:

```bash
# Required: PostgreSQL credentials — must be consistent with DATABASE_URL
POSTGRES_USER=aiassistant
POSTGRES_PASSWORD=<strong-random-password>
POSTGRES_DB=aiassistant
DATABASE_URL=postgresql://aiassistant:<strong-random-password>@postgres:5432/aiassistant

# Required: Better Auth secret (min 32 chars)
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
BETTER_AUTH_SECRET=<random-64-char-hex>

# Required: public URL users access the app from
BETTER_AUTH_URL=http://<server-ip>:2103

# Required: encryption key for AI provider credentials stored in DB
# Must be exactly 64 hex characters
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ENCRYPTION_KEY=<random-64-char-hex>

# Required: default admin account created on first startup
ADMIN_EMAIL=admin@yourcompany.com
ADMIN_PASSWORD=<strong-password>
DEFAULT_USER_PASSWORD=<default-password-for-new-users>

# Required: restrict CORS to the app's public URL
CORS_ORIGIN=http://<server-ip>:2103

# Required: public URL of the server as seen by the browser
# Must match BETTER_AUTH_URL (same origin, because Nginx proxies /rpc and /api/auth)
VITE_SERVER_URL=http://<server-ip>:2103

# Required: Redis connection (used by BullMQ document processing queue)
REDIS_URL=redis://redis:6379

# Required: MinIO object storage (for document uploads)
# MINIO_ROOT_USER / MINIO_ROOT_PASSWORD are used by the MinIO container itself
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=<strong-minio-password>
# MINIO_ENDPOINT: internal Docker service name — used by the server container
# to connect to MinIO. Must be "minio" (the Docker service name), NOT the public IP.
MINIO_ENDPOINT=minio
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=<strong-minio-password>
MINIO_BUCKET=documents
# MINIO_PUBLIC_ENDPOINT: public IP/hostname used to rewrite presigned URLs so
# browsers can reach MinIO directly for upload/download.
MINIO_PUBLIC_ENDPOINT=<server-ip>
```

The full `.env.docker.example` documents every available variable.

> **Important — `VITE_SERVER_URL` is a build-time variable.** It is baked into the JS bundle by Vite at `docker compose build` time, not at runtime. Changing `.env.docker` and restarting the container has no effect — you must rebuild the image with the correct value.

> **Important — always pass `--env-file .env.docker`** to every `docker compose` command. Docker Compose only auto-reads `.env` by default; without this flag, `VITE_SERVER_URL` will be empty at build time and the app will show a blank white page.

### 2. Start

```bash
docker compose --env-file .env.docker up -d --build
```

This starts all containers:

| Container               | Purpose                                                         |
| ----------------------- | --------------------------------------------------------------- |
| `ai_assistant_postgres` | PostgreSQL 16 (internal only)                                   |
| `ai_assistant_redis`    | Redis 7 — BullMQ job queue (internal only)                      |
| `ai_assistant_minio`    | MinIO — S3-compatible object storage (ports 9000, 9001)         |
| `ai_assistant_migrate`  | Runs `drizzle-kit push` once, then exits                        |
| `ai_assistant_server`   | Hono API server (internal, port 3000)                           |
| `ai_assistant_worker`   | BullMQ worker — converts uploaded PDFs to markdown              |
| `ai_assistant_web`      | Nginx — serves static web app + reverse proxies API (port 2103) |

The `migrate` service runs before `server` and `worker` start, so there is no race condition on first startup.

> **MinIO console** is accessible at `http://<server-ip>:9001`. Log in with `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD`. The `documents` bucket is created automatically on first server startup.

> **Always pass `--env-file .env.docker --build` when updating** — the web image must be rebuilt any time you change `VITE_SERVER_URL` or pull new code. Use `docker compose --env-file .env.docker up -d --build`.

### 3. First login

Open `http://<server-ip>:2103` and log in with the credentials set in `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

### 4. Setup Storage & Seed sample data (optional)

Create the MinIO `documents` bucket, and seed admin account, employees, departments, projects, and evaluation data (if `LEGACY_EVALUATION_DATABASE_URL` is set in `.env.docker`):

```bash
docker run --rm --network ai-assistant_default --env-file .env.docker ai-assistant-migrate:latest sh -c "cd /app/apps/server && bun src/seed/index.ts"
```

Edit [apps/server/src/seed/seed-employees.ts](../apps/server/src/seed/seed-employees.ts) and [apps/server/src/seed/seed-projects.ts](../apps/server/src/seed/seed-projects.ts) to customise the initial data before running.

### 5. Connect GitHub Copilot

Go to **Settings → AI Providers** and connect your GitHub Copilot account via OAuth. This is required for the AI chat feature.

## Option B — Development

### Prerequisites

| Tool       | Version | Purpose                   |
| ---------- | ------- | ------------------------- |
| Bun        | 1.x     | Runtime + package manager |
| Node.js    | 20+     | Tooling compatibility     |
| PostgreSQL | 15+     | Main database             |
| Docker     | 24+     | Running local PostgreSQL  |

### 1. Infrastructure

Start PostgreSQL, Redis, and MinIO with Docker (already configured in `packages/db/docker-compose.yml`):

```bash
bun run db:start
```

This starts all three services and waits until they are healthy before returning.

### 2. Install dependencies

```bash
bun install
```

### 3. Configure environment

Create `apps/server/.env`:

```bash
DATABASE_URL=postgresql://postgres:password@localhost:5433/workspace
BETTER_AUTH_SECRET=dev-only-secret-at-least-32-chars-long-xxxxxxxxxxx
BETTER_AUTH_URL=http://localhost:3001
CORS_ORIGIN=http://localhost:3001
ADMIN_EMAIL=admin@company.local
ADMIN_PASSWORD=admin123
DEFAULT_USER_PASSWORD=password123
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ENCRYPTION_KEY=<64-char-hex>
NODE_ENV=development

# Redis (BullMQ queue)
REDIS_URL=redis://localhost:6379

# MinIO (document storage)
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=documents
```

Create `apps/web/.env.local`:

```bash
VITE_SERVER_URL=http://localhost:3000
```

### 4. Set up the database

Push the schema and seed initial data (MinIO bucket, admin account, employees, categories, projects, and evaluation data) in one command:

```bash
bun run db:setup
```

> If you only want to push the schema without seeding, run `bun run db:push` instead.

### 5. Start all services

```bash
bun run dev
```

This starts both the Hono server (port **3000**) and the Vite dev server (port **3001**) via Turborepo.

Or start them individually:

```bash
bun run dev:server          # Hono on :3000
bun run dev:web             # Vite on :3001
bun run dev:worker          # BullMQ document processing worker
```

Open `http://localhost:3001`.

---

## Environment variables reference

| Variable                   | Default                | Description                                                                     |
| -------------------------- | ---------------------- | ------------------------------------------------------------------------------- |
| `POSTGRES_USER`            | `aiassistant`          | PostgreSQL username — used to initialise the postgres container                 |
| `POSTGRES_PASSWORD`        | —                      | PostgreSQL password — must match the value in `DATABASE_URL`                    |
| `POSTGRES_DB`              | `aiassistant`          | PostgreSQL database name — must match the value in `DATABASE_URL`               |
| `DATABASE_URL`             | —                      | Full PostgreSQL connection string — must be consistent with `POSTGRES_*` vars   |
| `BETTER_AUTH_SECRET`       | —                      | Auth signing secret. Must be changed in production (min 32 chars)               |
| `BETTER_AUTH_URL`          | —                      | Public URL of the app — used for OAuth redirects                                |
| `CORS_ORIGIN`              | —                      | Allowed CORS origin (single URL)                                                |
| `ADMIN_EMAIL`              | —                      | Admin account email, created on first startup                                   |
| `ADMIN_PASSWORD`           | —                      | Admin account password                                                          |
| `DEFAULT_USER_PASSWORD`    | —                      | Default password assigned to newly seeded users                                 |
| `ENCRYPTION_KEY`           | —                      | 64-char hex key for encrypting AI provider credentials in the DB                |
| `GITHUB_COPILOT_CLIENT_ID` | `Iv1.b507a08c87ecfe98` | GitHub OAuth App Client ID for Copilot integration                              |
| `OLLAMA_BASE_URL`          | —                      | Ollama base URL (use `http://host.docker.internal:11434` when running on host)  |
| `VITE_SERVER_URL`          | —                      | Public API URL as seen by the browser — **baked into the bundle at build time** |
| `NODE_ENV`                 | `development`          | Set to `production` in Docker                                                   |
| `REDIS_URL`                | `redis://redis:6379`   | Redis connection string — used by BullMQ document processing queue              |
| `MINIO_ROOT_USER`          | `minioadmin`           | MinIO root username — used by the MinIO container                               |
| `MINIO_ROOT_PASSWORD`      | —                      | MinIO root password — must match `MINIO_SECRET_KEY`                             |
| `MINIO_ENDPOINT`           | —                      | MinIO internal hostname for server→MinIO connections. Use `minio` in Docker     |
| `MINIO_PUBLIC_ENDPOINT`    | —                      | Public IP/hostname rewritten into presigned URLs so browsers can reach MinIO    |
| `MINIO_PORT`               | `9000`                 | MinIO API port                                                                  |
| `MINIO_USE_SSL`            | `false`                | Set to `true` if MinIO is behind HTTPS                                          |
| `MINIO_ACCESS_KEY`         | —                      | MinIO access key (same value as `MINIO_ROOT_USER` in a simple setup)            |
| `MINIO_SECRET_KEY`         | —                      | MinIO secret key (same value as `MINIO_ROOT_PASSWORD` in a simple setup)        |
| `MINIO_BUCKET`             | `documents`            | Bucket name for uploaded documents (created automatically on startup)           |

---

## Troubleshooting

| Issue                                                         | Solution                                                                                                       |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `connection refused` on port 5432                             | PostgreSQL not running — run `bun run db:start`                                                                |
| `BETTER_AUTH_SECRET must be at least 32 characters`           | Generate a proper secret: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`           |
| `ENCRYPTION_KEY must be a 64-character hex string`            | Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`                           |
| Frontend still calls old URL after changing `VITE_SERVER_URL` | `VITE_SERVER_URL` is baked in at build time — rebuild: `docker compose --env-file .env.docker up -d --build`   |
| CORS errors in browser                                        | Ensure `CORS_ORIGIN` in `.env.docker` exactly matches the URL you open in the browser                          |
| Auth redirect loop                                            | `BETTER_AUTH_URL` must match the URL you open in the browser (including port)                                  |
| `migrate` container keeps restarting                          | Database credentials mismatch — check `DATABASE_URL` matches `POSTGRES_USER`/`POSTGRES_PASSWORD`/`POSTGRES_DB` |
| GitHub Copilot OAuth not working                              | `BETTER_AUTH_URL` must be publicly reachable for the OAuth callback                                            |
| Document upload fails / bucket not found                      | Ensure `MINIO_BUCKET` exists — the server creates it automatically on startup; check MinIO logs                |
| Upload/download fails with `ECONNREFUSED`                     | `MINIO_ENDPOINT` must be `minio` (Docker internal), not the public IP — the server can't reach itself via LAN  |
| Presigned URLs don't work in browser                          | Set `MINIO_PUBLIC_ENDPOINT=<server-ip>` so URLs are rewritten to the public address                            |
| Documents stuck in `PENDING` status                           | Worker is not running — check `ai_assistant_worker` logs or run `bun run dev:worker` locally                   |
