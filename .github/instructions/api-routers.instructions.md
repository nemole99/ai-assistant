---
description: "Use when creating or modifying oRPC API routers, procedures, or backend endpoints. Covers authorization, validation, and error patterns."
applyTo: "packages/api/src/routers/**"
---

# API Router Conventions

- Pick the correct procedure base: `publicProcedure | protectedProcedure | managerProcedure | adminProcedure` — authorization lives here, not in the UI.
- Define `.input()` and `.output()` with Zod schemas. Reuse `insert*Schema` / `select*Schema` from `@workspace/db/schema/validation`.
- Throw `ORPCError("NOT_FOUND" | "UNAUTHORIZED" | "FORBIDDEN" | "BAD_REQUEST")` — never plain `Error`.
- Name procedures as verb + subject: `list`, `get`, `create`, `update`, `delete`.
- Export the router object from the file; register it in `packages/api/src/routers/index.ts`.
- Access DB via `db` from `@workspace/db`; access current user via `context.user`.
- See existing routers in this folder for reference (e.g., `project.ts`, `document.ts`).
