FROM oven/bun:1 AS builder
WORKDIR /app

# Copy manifests first for better layer caching
COPY package.json bun.lock* bun.lockb* turbo.json ./
COPY apps/server/package.json apps/server/
COPY packages/api/package.json packages/api/
COPY packages/auth/package.json packages/auth/
COPY packages/db/package.json packages/db/
COPY packages/env/package.json packages/env/
COPY packages/config/package.json packages/config/
COPY packages/ui/package.json packages/ui/

RUN bun install

COPY apps/server/ apps/server/
COPY packages/ packages/

# Compile a self-contained binary — bundles all deps (including @orpc, @workspace/*)
RUN bun build --compile --sourcemap ./apps/server/src/index.ts --outfile /server-bin

# ── Runtime ──────────────────────────────────────────────────
FROM oven/bun:1-slim AS runtime
WORKDIR /app

# Self-contained binary needs no node_modules to run
COPY --from=builder /server-bin ./server-bin
# node_modules + packages + server src needed by migrate + seed services
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/server/src ./apps/server/src
COPY --from=builder /app/apps/server/package.json ./apps/server/package.json
COPY --from=builder /app/package.json ./

EXPOSE 3000
CMD ["/app/server-bin"]
