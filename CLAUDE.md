# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Internal tooling platform for a ~50-person software company: document management (PDF → markdown), LLM-maintained wiki knowledge base, RAG chat with citations, ticket description generator, employee/department/project management, and a developer evaluation module (effort tickets, timesheet, KPI).

**[CONTEXT.md](CONTEXT.md) is the source of truth for domain language.** Use its exact entity names (`User` ≠ `Employee`, `Document` ≠ `WikiPage`, `evaluation_*` not `copilot_*`, etc.) and check it before naming anything new. ADRs in [docs/adr/](docs/adr/) and PRDs in [docs/prd/](docs/prd/) record structural decisions — read before proposing changes.

## Commands

Use **Bun**, never npm/pnpm/yarn. All commands run from the repo root unless noted.

```sh
bun install                # install dependencies
bun run dev                # web + server + worker, hot-reload
bun run dev:web            # web only (http://localhost:3001)
bun run dev:server         # API server only (http://localhost:3000)
bun run check-types        # TypeScript check across all packages
bun run check              # lint + format check (Oxlint + Oxfmt via ultracite)
bun run fix                # auto-fix lint + format issues
bun run build              # production build (turbo)
```

Database / infrastructure (Docker: PostgreSQL on 5433, Redis on 6379, MinIO on 9000/9001):

```sh
bun run db:start           # start Docker containers
bun run db:push            # push Drizzle schema (dev)
bun run db:generate        # generate migrations
bun run db:migrate         # run migrations
bun run db:seed            # seed admin, employees, categories, projects, MinIO bucket
bun run db:studio          # Drizzle Studio UI
bun run db:stop            # stop containers (keep data)
bun run db:down            # stop + wipe volumes
```

First-time setup: `cp apps/server/.env.example apps/server/.env` (defaults match Docker Compose), and `pip install 'markitdown[pptx, pdf, docx, xlsx, xls]'` for the document worker.

### Tests

Vitest with `vitest-browser-react` + Playwright, colocated as `*.test.tsx` next to components:

```sh
cd apps/web && bunx vitest run                    # single run
cd apps/web && bunx vitest run path/to/x.test.tsx # single file
cd apps/web && bunx vitest                        # watch mode
```

Use `render` from `vitest-browser-react` and `userEvent` from `vitest/browser`. Wrap components in their runtime providers (Theme, Direction, Layout, Sidebar) — see `apps/web/src/test-utils/`.

## Architecture

Bun + Turborepo monorepo. Cross-package imports are always `@workspace/<pkg>` — never relative paths across packages. Shared dependency versions live in the root `package.json` `workspaces.catalog`; reference them as `"dep": "catalog:"`.

- `apps/web` — React 19 + TanStack Router (Vite). Feature-based layout: `src/features/<area>/` (ask-ai, documents, wiki, evaluation, employees, projects, …) holds components/data per feature; `src/routes/` is TanStack Router file-based routing (`routeTree.gen.ts` is generated).
- `apps/server` — two entry points: `src/index.ts` (Hono HTTP server mounting Better-Auth at `/api/auth/*`, oRPC RPC handler at `/rpc`, OpenAPI reference at `/api-reference`, plus AI streaming routes in `src/routes/ai.ts`) and `src/worker.ts` (BullMQ worker: PDF → markdown via `markitdown` CLI, then the wiki ingestion pipeline in `src/wiki/`).
- `packages/api` — oRPC routers (`src/routers/`) and procedure builders.
- `packages/db` — Drizzle schema (`src/schema/`), Docker Compose for infra.
- `packages/auth` — Better-Auth config.
- `packages/queue` — BullMQ queue/job definitions (Redis).
- `packages/storage` — MinIO (S3-compatible) abstraction.
- `packages/ui` — shared shadcn/ui primitives.
- `packages/env` — Zod-validated environment variables.

### Authorization

Enforced **at the procedure level** in `packages/api/src/index.ts`: `publicProcedure | protectedProcedure | managerProcedure | adminProcedure`. UI-level guards are presentation only — never the source of truth. Roles: `ADMIN | MANAGER | EMPLOYEE` on `User`. `managerProcedure` accepts both ADMIN and MANAGER.

### Key data-flow: document → wiki → RAG chat

1. Admin uploads PDF → stored in MinIO, `Document` row `PENDING` → BullMQ job converts to markdown (`markitdown`) → `COMPLETED`.
2. Worker then runs the IngestionPipeline (EXTRACT → PLAN → COMMIT) using `SystemAIConfig` (admin-configured system-level LLM/embedding); creates/updates `WikiPage` rows and re-embeds `WikiPageChunk` (pgvector) → `INGESTED`. If SystemAIConfig is unconfigured, documents stop at `COMPLETED`.
3. Ask AI chat always vector-searches `WikiPageChunk` (not raw documents) and cites source WikiPages.

Per-user AI config (`AIProvider` + `AIModelAssignment`, purposes `chat`/`embedding`/`vision`) is separate from system-level `SystemAIConfig` (purposes `pipeline_text`/`pipeline_embedding`).

### Conventions

- **Domain entities**: `User` (auth identity) and `Employee` (HR profile) are separate tables linked by nullable `userId` — see [docs/adr/0001](docs/adr/0001-separated-user-employee-models.md). An Employee may exist without a User; an Admin may have no Employee.
- **Forms**: TanStack React Form only — never React Hook Form.
- **API errors**: throw `ORPCError("UNAUTHORIZED" | "FORBIDDEN" | ...)` from procedures; surface on the client via `sonner` toasts.
- **UI components**: import shared primitives from `@workspace/ui/components/*`; add new ones with `npx shadcn@latest add <name> -c packages/ui`. App-specific blocks go in `apps/web/src/components/` or the relevant `features/<area>/`.
- **Schema changes**: edit `packages/db/src/schema/`, then `bun run db:push` (dev) or `db:generate` + `db:migrate`.
- **Evaluation module**: DB tables use the `evaluation_*` prefix, route `/evaluation`. Developers are FKs to `employee.id`, projects are FKs to `project.id` — never free-text names. Employee writes own effort tickets/sharing logs; Manager sets targets, manages timesheet, imports from Jira.
- **Out of scope — do not introduce**: multi-tenancy, hierarchical departments, employee PII fields.
- Run `bun run check` (or `bun x ultracite fix`) before committing; lefthook runs hooks on commit.
