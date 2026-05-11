# workspace

This project was created with [Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack), a modern TypeScript stack that combines React, TanStack Router, Hono, ORPC, and more.

## Features

- **TypeScript** - For type safety and improved developer experience
- **TanStack Router** - File-based routing with full type safety
- **TailwindCSS** - Utility-first CSS for rapid UI development
- **Shared UI package** - shadcn/ui primitives live in `packages/ui`
- **Hono** - Lightweight, performant server framework
- **oRPC** - End-to-end type-safe APIs with OpenAPI integration
- **Bun** - Runtime environment
- **Drizzle** - TypeScript-first ORM
- **PostgreSQL** - Database engine
- **Authentication** - Better-Auth
- **Oxlint** - Oxlint + Oxfmt (linting & formatting)
- **Turborepo** - Optimized monorepo build system

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) >= 1.3.11
- [Node.js](https://nodejs.org) >= 25.8.2
- [Docker](https://www.docker.com) (for running PostgreSQL locally)

### 1. Install dependencies

```bash
bun install
```

### 2. Configure environment variables

Copy the example env file and adjust if needed:

```bash
cp apps/server/.env.example apps/server/.env
```

The defaults already match the Docker Compose config below, so no changes are required for local development.

### 3. Start the database

```bash
bun run db:start
```

This spins up a PostgreSQL container on **port 5433** via Docker Compose (`packages/db/docker-compose.yml`).

### 4. Push the schema

```bash
bun run db:push
```

### 5. Seed initial data

Seed admin account (bắt buộc lần đầu):

```bash
bun run db:seed
```

Seed danh sách nhân viên mẫu (tuỳ chọn):

```bash
bun run db:seed-employees
```

Seed danh sách projects mẫu (tuỳ chọn):

```bash
bun run db:seed-projects
```

### 6. Start the development server

```bash
bun run dev
```

- Web app: [http://localhost:5173](http://localhost:5173)
- API: [http://localhost:3000](http://localhost:3000)

---

### Stopping / cleaning up the database

```bash
# Stop the container (data is preserved)
bun run db:stop

# Stop and remove volumes (wipes all data)
bun run db:down
```

## UI Customization

React web apps in this stack share shadcn/ui primitives through `packages/ui`.

- Change design tokens and global styles in `packages/ui/src/styles/globals.css`
- Update shared primitives in `packages/ui/src/components/*`
- Adjust shadcn aliases or style config in `packages/ui/components.json` and `apps/web/components.json`

### Add more shared components

Run this from the project root to add more primitives to the shared UI package:

```bash
npx shadcn@latest add accordion dialog popover sheet table -c packages/ui
```

Import shared components like this:

```tsx
import { Button } from "@workspace/ui/components/button";
```

### Add app-specific blocks

If you want to add app-specific blocks instead of shared primitives, run the shadcn CLI from `apps/web`.

## Git Hooks and Formatting

- Format and lint fix: `bun run check`

## Project Structure

```
workspace/
├── apps/
│   ├── web/         # Frontend application (React + TanStack Router)
│   └── server/      # Backend API (Hono, ORPC)
├── packages/
│   ├── ui/          # Shared shadcn/ui components and styles
│   ├── api/         # API layer / business logic
│   ├── auth/        # Authentication configuration & logic
│   └── db/          # Database schema & queries
```

## Available Scripts

- `bun run dev`: Start all applications in development mode
- `bun run build`: Build all applications
- `bun run dev:web`: Start only the web application
- `bun run dev:server`: Start only the server
- `bun run check-types`: Check TypeScript types across all apps
- `bun run db:push`: Push schema changes to database
- `bun run db:generate`: Generate database client/types
- `bun run db:migrate`: Run database migrations
- `bun run db:studio`: Open database studio UI
- `bun run check`: Run Oxlint and Oxfmt
