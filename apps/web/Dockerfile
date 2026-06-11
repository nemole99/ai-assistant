FROM oven/bun:1 AS builder
WORKDIR /app

ARG VITE_SERVER_URL
ENV VITE_SERVER_URL=$VITE_SERVER_URL

# Copy manifests first for better layer caching
COPY package.json bun.lock* bun.lockb* turbo.json ./
COPY apps/web/package.json apps/web/
COPY packages/api/package.json packages/api/
COPY packages/auth/package.json packages/auth/
COPY packages/db/package.json packages/db/
COPY packages/env/package.json packages/env/
COPY packages/config/package.json packages/config/
COPY packages/ui/package.json packages/ui/
COPY packages/queue/package.json packages/queue/
COPY packages/storage/package.json packages/storage/

RUN bun install --ignore-scripts

COPY apps/web/ apps/web/
COPY packages/ packages/

RUN cd apps/web && bun run build

# ── Nginx ────────────────────────────────────────────────────
FROM nginx:alpine AS runtime

COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
