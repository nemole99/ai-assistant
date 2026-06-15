# AI Assistant — Internal Tooling Platform

- **Document Management** — Upload tài liệu dự án (PDF), tự động convert sang markdown
- **Wiki Knowledge Base** — LLM tổng hợp Document thành WikiPage, duy trì cross-reference tự động
- **Ask AI (RAG Chat)** — Chatbot trả lời dựa trên vector search WikiPage, có citation nguồn
- **Ticket Description Generator** — AI format mô tả thô thành ticket theo template nội bộ
- **Employee & Department Management** — Quản lý nhân sự, phòng ban, dự án

## Tech Stack

| Layer         | Technology                                                    |
| ------------- | ------------------------------------------------------------- |
| Frontend      | React, TanStack Router, TanStack Form, TailwindCSS, shadcn/ui |
| Backend       | Hono, oRPC, Bun                                               |
| Worker        | BullMQ (Redis-backed job queue)                               |
| Database      | PostgreSQL + pgvector, Drizzle ORM                            |
| Storage       | MinIO (S3-compatible)                                         |
| AI            | Vercel AI SDK (Anthropic, OpenAI, Google, Ollama)             |
| Auth          | Better-Auth                                                   |
| Monorepo      | Turborepo, Bun workspaces                                     |
| Lint & Format | Oxlint + Oxfmt                                                |

## Project Structure

```
ai-assistant/
├── apps/
│   ├── web/              # Frontend (React + TanStack Router)
│   └── server/           # API server + Worker (Hono, oRPC, BullMQ)
├── packages/
│   ├── api/              # Shared API contracts & business logic
│   ├── auth/             # Authentication configuration
│   ├── db/               # Database schema, migrations & Docker infra
│   ├── env/              # Shared environment variable validation
│   ├── queue/            # BullMQ job definitions
│   ├── storage/          # MinIO storage abstraction
│   ├── ui/               # Shared shadcn/ui components & styles
│   └── config/           # Shared tooling config (TypeScript, etc.)
├── docker-compose.yml    # Production: all services in Docker
└── CONTEXT.md            # Domain language & project decisions
```

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) >= 1.3.11
- [Node.js](https://nodejs.org) >= 25.8.2
- [Docker](https://www.docker.com) (for PostgreSQL, Redis, MinIO)
- [Python 3](https://www.python.org) + `markitdown` (for document processing worker)

```bash
# Install markitdown (one-time setup)
pip install 'markitdown[pptx, pdf, docx, xlsx, xls]'
```

### 1. Install dependencies

```bash
bun install
```

### 2. Configure environment variables

```bash
cp apps/server/.env.example apps/server/.env
```

Defaults đã match với Docker Compose config — không cần chỉnh cho local dev.

### 3. Set up database

Khởi động PostgreSQL (port `5433`), Redis (port `6379`), MinIO (port `9000`/`9001`), push schema, và seed dữ liệu ban đầu (MinIO bucket, admin account, employees, categories, projects) chỉ với 1 lệnh:

```bash
bun run db:setup
```

> Cần chạy riêng từng bước? Dùng `bun run db:start`, `bun run db:push`, `bun run db:seed`.

### 4. Start development

```bash
bun run dev
```

Chạy đồng thời web, server, và worker (hot-reload):

| Service       | URL                                            |
| ------------- | ---------------------------------------------- |
| Web           | [http://localhost:3001](http://localhost:3001) |
| API Server    | [http://localhost:3000](http://localhost:3000) |
| MinIO Console | [http://localhost:9001](http://localhost:9001) |

### Stopping infrastructure

```bash
# Stop containers (data preserved)
bun run db:stop

# Stop and remove volumes (wipes all data)
bun run db:down
```

## Available Scripts

| Script                | Description                               |
| --------------------- | ----------------------------------------- |
| `bun run dev`         | Start web + server + worker (hot-reload)  |
| `bun run dev:web`     | Start web only                            |
| `bun run dev:server`  | Start server only                         |
| `bun run build`       | Build all apps for production             |
| `bun run check-types` | TypeScript type check across all packages |
| `bun run db:setup`    | Start Docker + push schema + seed data    |
| `bun run db:start`    | Start Docker infrastructure               |
| `bun run db:stop`     | Stop Docker containers                    |
| `bun run db:down`     | Stop + remove volumes                     |
| `bun run db:push`     | Push schema changes to database           |
| `bun run db:generate` | Generate Drizzle migrations               |
| `bun run db:migrate`  | Run Drizzle migrations                    |
| `bun run db:studio`   | Open Drizzle Studio UI                    |
| `bun run db:seed`     | Seed database with initial data           |
| `bun run check`       | Run Oxlint + Oxfmt                        |
| `bun run lint`        | Run Oxlint only                           |
| `bun run format`      | Run Oxfmt only                            |

## Production Deployment

Xem [Setup Guide](docs/SETUP.md#option-a--docker-production) để biết cách deploy toàn bộ services bằng Docker Compose.
