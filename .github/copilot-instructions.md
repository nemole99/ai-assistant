# Project Guidelines

Internal tooling platform for a ~50-person software company. Bun + Turborepo monorepo with React/TanStack Router web, Hono/oRPC server, Drizzle/PostgreSQL, Better-Auth.

## Domain Language

Use the exact entity names defined in [CONTEXT.md](../CONTEXT.md). Notably:

- **User** = auth identity (email, password, role). Never `Account` or `Member`.
- **Employee** = HR profile (department, position). Never `Staff` or `Member`.
- **Department** = flat org unit. Never `Team` or `Group`.
- **Role** ∈ `ADMIN | MANAGER | EMPLOYEE`. Never `Permission`.

`User` and `Employee` are separate tables linked via nullable `userId` — see [docs/adr/0001-separated-user-employee-models.md](../docs/adr/0001-separated-user-employee-models.md). An Employee may exist before its User; an Admin may have no Employee.

## Architecture

Workspace packages (import as `@workspace/*`):

- `apps/web` — React 19 + TanStack Router (Vite, port 5173)
- `apps/server` — Hono entry (port 3000)
- `packages/api` — oRPC routers; export procedures from `packages/api/src/index.ts`
- `packages/auth` — Better-Auth config
- `packages/db` — Drizzle schema (PostgreSQL on port 5433)
- `packages/ui` — shared shadcn/ui primitives
- `packages/env` — Zod-validated env

Authorization is **always** enforced at the procedure level using `publicProcedure | protectedProcedure | managerProcedure | adminProcedure` from `@workspace/api`. Do not add UI-only auth guards as the source of truth.

Browse existing PRDs in [docs/prd/](../docs/prd/) and ADRs in [docs/adr/](../docs/adr/) before proposing structural changes.

## Build, Lint, Test

- Install: `bun install`
- Dev (all): `bun run dev` — or `bun run dev:web` / `bun run dev:server`
- Type check: `bun run check-types`
- Lint + format: `bun run check` (Oxlint + Oxfmt)
- DB: `bun run db:push`, `bun run db:studio`, `bun run db:start`

Use **Bun**, not npm/pnpm/yarn. Use `bun run <script>` for any package script.

## Conventions

- **Dependencies**: shared versions live in the root `package.json` `workspaces.catalog`. Reference them via `"dep": "catalog:"` in package manifests rather than pinning a new version.
- **Cross-package imports**: always `@workspace/<pkg>` — never relative paths across packages.
- **Forms**: TanStack React Form for authenticated/protected flows; React Hook Form is only used in the existing public auth forms. Prefer TanStack Form for new work.
- **API errors**: throw `ORPCError("UNAUTHORIZED" | "FORBIDDEN" | ...)` from procedures; surface to users via `sonner` toasts on the client.
- **UI components**: import shared primitives from `@workspace/ui/components/*`. Add new shared primitives via `npx shadcn@latest add <name> -c packages/ui`. App-specific blocks go under `apps/web/src/components/` or the relevant `features/<area>/`.
- **Frontend feature layout**: code is grouped by feature under `apps/web/src/features/<area>/` (components, routes, data). Mirror that pattern for new features.
- **Schema changes**: edit Drizzle schema under `packages/db/src/schema/`, then `bun run db:push` (dev) or `bun run db:generate` + `bun run db:migrate`.
- **Don't introduce**: multi-tenancy, hierarchical departments, or employee PII fields — explicitly out of scope.
