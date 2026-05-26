---
description: "Use when creating or modifying frontend features, pages, components, or data hooks in the web app."
applyTo: "apps/web/src/features/**"
---
# Frontend Feature Conventions

- Features are self-contained under `apps/web/src/features/<area>/` with `components/`, `data/` (schemas + queries), `hooks/`, and `index.tsx`.
- Use `orpc.<router>.<procedure>.queryOptions()` / `.mutationOptions()` for React Query integration — see `apps/web/src/lib/orpc.ts`.
- Derive types from the API client (`Awaited<ReturnType<...>>`) instead of duplicating schemas.
- Forms use **TanStack React Form** — not React Hook Form.
- Import shared primitives from `@workspace/ui/components/*`. App-specific components go in `features/<area>/components/`.
- Surface errors via `sonner` toasts in `onError` callbacks.
- Invalidate queries on mutation success using the same procedure reference for type safety.
- Routes use TanStack Router with file-based routing under `apps/web/src/routes/`.
