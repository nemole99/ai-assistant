---
description: "Use when modifying Drizzle ORM schema, adding tables/columns, or creating migrations."
applyTo: "packages/db/src/schema/**"
---

# Database Schema Conventions

- All schema lives in `packages/db/src/schema/`. Re-export from `index.ts`.
- Validation schemas go in `validation.ts` — define `insert*Schema`, `update*Schema`, `select*Schema` using `drizzle-zod`.
- After editing schema: `bun run db:push` (dev) or `bun run db:generate` + `bun run db:migrate` (production).
- Use the domain language from [CONTEXT.md](../../CONTEXT.md): User, Employee, Department, Role, Project, Document — no aliases.
- `User` and `Employee` are separate tables linked via nullable `userId` — see [ADR-0001](../../docs/adr/0001-separated-user-employee-models.md).
- Do not add: multi-tenancy columns, hierarchical department references, or employee PII fields.
