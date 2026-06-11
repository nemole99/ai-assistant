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
COPY packages/queue/package.json packages/queue/
COPY packages/storage/package.json packages/storage/

RUN bun install --ignore-scripts

COPY apps/server/ apps/server/
COPY packages/ packages/

# Compile self-contained binaries for both server and worker
RUN bun build --compile --sourcemap ./apps/server/src/index.ts --outfile /server-bin --external msgpackr-extract
RUN bun build --compile --sourcemap ./apps/server/src/worker.ts --outfile /worker-bin --external msgpackr-extract

# ── Runtime ──────────────────────────────────────────────────
FROM oven/bun:1-slim AS runtime
WORKDIR /app

# Python + markitdown for the document processing worker
RUN apt-get update && \
    apt-get install -y --no-install-recommends python3 python3-pip && \
    pip3 install --break-system-packages 'markitdown[pptx, pdf, docx, xlsx, xls]' && \
    apt-get purge -y python3-pip && \
    apt-get autoremove -y && \
    apt-get clean && rm -rf /var/lib/apt/lists/* /root/.cache

COPY --from=builder /server-bin ./server-bin
COPY --from=builder /worker-bin ./worker-bin
# node_modules + packages + server src needed by migrate + seed services
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/server/src ./apps/server/src
COPY --from=builder /app/apps/server/package.json ./apps/server/package.json
COPY --from=builder /app/package.json ./

EXPOSE 3000
CMD ["/app/server-bin"]
