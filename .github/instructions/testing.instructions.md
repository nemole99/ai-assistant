---
description: "Use when writing or modifying tests, test utilities, or test setup files."
applyTo: "apps/web/src/**/*.test.{ts,tsx}"
---

# Testing Conventions

- Framework: Vitest + `vitest-browser-react` + Playwright. Run: `cd apps/web && bunx vitest` (watch) or `bunx vitest run` (single).
- Tests are colocated: `component.test.tsx` next to `component.tsx`.
- Use `render` from `vitest-browser-react` and `userEvent` from `vitest/browser`.
- Wrap components in runtime providers: `ThemeProvider`, `DirectionProvider`, `LayoutProvider`, `SidebarProvider` as needed.
- See [apps/web/src/test-utils/](../../apps/web/src/test-utils/) for shared helpers (e.g., cookie utilities).
- Import test functions from `vitest`: `describe`, `it`, `expect`, `vi`, `beforeEach`.
