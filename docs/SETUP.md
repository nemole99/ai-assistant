# Setup Guide

Two ways to run AI Assistant: **Docker** (recommended for production) or **Development** (for local development and contributing).

---

## Option A — Docker (Production)

### Prerequisites

- Docker Engine 24+
- Docker Compose v2+
- Access to an AI provider via GitHub Copilot OAuth

### 1. Clone and configure

```bash
git clone https://github.com/ngocla99/ai-assistant.git
cd ai-assistant
cp .env.docker.example .env.docker
```

Edit `.env.docker` and fill in all required values:

```bash
# Required: PostgreSQL credentials — must be consistent with DATABASE_URL
POSTGRES_USER=aiassistant
POSTGRES_PASSWORD=<strong-random-password>
POSTGRES_DB=aiassistant
DATABASE_URL=postgresql://aiassistant:<strong-random-password>@postgres:5432/aiassistant

# Required: Better Auth secret (min 32 chars)
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
BETTER_AUTH_SECRET=<random-64-char-hex>

# Required: public URL users access the app from
BETTER_AUTH_URL=http://<server-ip>:2103

# Required: encryption key for AI provider credentials stored in DB
# Must be exactly 64 hex characters
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ENCRYPTION_KEY=<random-64-char-hex>

# Required: default admin account created on first startup
ADMIN_EMAIL=admin@yourcompany.com
ADMIN_PASSWORD=<strong-password>
DEFAULT_USER_PASSWORD=<default-password-for-new-users>

# Required: restrict CORS to the app's public URL
CORS_ORIGIN=http://<server-ip>:2103

# Required: public URL of the server as seen by the browser
# Must match BETTER_AUTH_URL (same origin, because Nginx proxies /rpc and /api/auth)
VITE_SERVER_URL=http://<server-ip>:2103
```

The full `.env.docker.example` documents every available variable.

> **Important — `VITE_SERVER_URL` is a build-time variable.** It is baked into the JS bundle by Vite at `docker compose build` time, not at runtime. Changing `.env.docker` and restarting the container has no effect — you must rebuild the image with the correct value.

> **Important — always pass `--env-file .env.docker`** to every `docker compose` command. Docker Compose only auto-reads `.env` by default; without this flag, `VITE_SERVER_URL` will be empty at build time and the app will show a blank white page.

### 2. Start

```bash
docker compose --env-file .env.docker up -d --build
```

This starts all containers:

| Container               | Purpose                                                         |
| ----------------------- | --------------------------------------------------------------- |
| `ai_assistant_postgres` | PostgreSQL 16 (internal only)                                   |
| `ai_assistant_migrate`  | Runs `drizzle-kit push` once, then exits                        |
| `ai_assistant_server`   | Hono API server (internal, port 3000)                           |
| `ai_assistant_web`      | Nginx — serves static web app + reverse proxies API (port 2103) |

The `migrate` service runs before `server` starts, so there is no race condition on first startup.

> **Always pass `--env-file .env.docker --build` when updating** — the web image must be rebuilt any time you change `VITE_SERVER_URL` or pull new code.

### 3. First login

Open `http://<server-ip>:2103` and log in with the credentials set in `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

### 4. Seed sample data (optional)

Seed employees and departments:

```bash
docker run --rm --network ai-assistant_default --env-file .env.docker ai-assistant-migrate:latest sh -c "cd /app/apps/server && bun src/seed/seed-employees.ts"
```

Seed projects:

```bash
docker run --rm --network ai-assistant_default --env-file .env.docker ai-assistant-migrate:latest sh -c "cd /app/apps/server && bun src/seed/seed-projects.ts"
```

Edit [apps/server/src/seed/seed-employees.ts](../apps/server/src/seed/seed-employees.ts) to customise departments, positions, and employee list before running.

### 5. Connect GitHub Copilot

Go to **Settings → AI Providers** and connect your GitHub Copilot account via OAuth. This is required for the AI chat feature.

---

## Option A2 — Deploying to a Linux server

### 1. Install Docker Engine

On the server (use Docker Engine directly, not Docker Desktop):

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker
```

Verify:

```bash
docker version
docker compose version   # must be v2+
```

### 2. Open firewall port

Only the web port needs to be accessible from users' browsers:

```bash
sudo ufw allow 2103/tcp   # Web app (Nginx)
sudo ufw enable
```

Do **not** expose port 5432 (PostgreSQL) or 3000 (Hono server) externally — they communicate only inside the Docker network.

### 3. Clone, configure, and start

```bash
git clone https://github.com/ngocla99/ai-assistant.git
cd ai-assistant
cp .env.docker.example .env.docker
# Edit .env.docker — replace <server-ip> with your actual server IP
docker compose up -d --build
```

### 4. Verify

```bash
# Check all containers
docker compose ps

# Check server health
curl http://localhost:3000/
# Should return: OK

# Check logs
docker compose logs -f server
```

Open `http://<server-ip>:2103` from your browser and log in.

### Optional: Nginx reverse proxy (custom domain + SSL)

If you have a domain and want HTTPS, put a host-level Nginx in front:

```nginx
# /etc/nginx/sites-available/ai-assistant
server {
    listen 80;
    server_name ai.yourcompany.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name ai.yourcompany.com;

    ssl_certificate     /etc/letsencrypt/live/ai.yourcompany.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ai.yourcompany.com/privkey.pem;

    location / {
        proxy_pass http://localhost:2103;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

Then install a certificate:

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d ai.yourcompany.com
```

Update `.env.docker` with the HTTPS URLs, then rebuild:

```bash
# In .env.docker:
# BETTER_AUTH_URL=https://ai.yourcompany.com
# CORS_ORIGIN=https://ai.yourcompany.com
# VITE_SERVER_URL=https://ai.yourcompany.com

docker compose up -d --build
```

---

## Option B — Development

### Prerequisites

| Tool       | Version | Purpose                   |
| ---------- | ------- | ------------------------- |
| Bun        | 1.x     | Runtime + package manager |
| Node.js    | 20+     | Tooling compatibility     |
| PostgreSQL | 15+     | Main database             |
| Docker     | 24+     | Running local PostgreSQL  |

### 1. Infrastructure

Start PostgreSQL with Docker (already configured in `packages/db/docker-compose.yml`):

```bash
bun run db:start
```

This starts PostgreSQL on port **5433** (to avoid conflicts with any local Postgres install).

### 2. Install dependencies

```bash
bun install
```

### 3. Configure environment

Create `apps/server/.env`:

```bash
DATABASE_URL=postgresql://postgres:password@localhost:5433/workspace
BETTER_AUTH_SECRET=dev-only-secret-at-least-32-chars-long-xxxxxxxxxxx
BETTER_AUTH_URL=http://localhost:3001
CORS_ORIGIN=http://localhost:3001
ADMIN_EMAIL=admin@company.local
ADMIN_PASSWORD=admin123
DEFAULT_USER_PASSWORD=password123
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ENCRYPTION_KEY=<64-char-hex>
NODE_ENV=development
```

Create `apps/web/.env.local`:

```bash
VITE_SERVER_URL=http://localhost:3000
```

### 4. Push database schema

```bash
bun run db:push
```

### 5. Seed initial data (optional)

```bash
bun run db:seed
```

### 6. Start all services

```bash
bun run dev
```

This starts both the Hono server (port **3000**) and the Vite dev server (port **3001**) via Turborepo.

Or start them individually:

```bash
bun run dev:server   # Hono on :3000
bun run dev:web      # Vite on :3001
```

Open `http://localhost:3001`.

---

## Environment variables reference

| Variable                   | Default                | Description                                                                     |
| -------------------------- | ---------------------- | ------------------------------------------------------------------------------- |
| `POSTGRES_USER`            | `aiassistant`          | PostgreSQL username — used to initialise the postgres container                 |
| `POSTGRES_PASSWORD`        | —                      | PostgreSQL password — must match the value in `DATABASE_URL`                    |
| `POSTGRES_DB`              | `aiassistant`          | PostgreSQL database name — must match the value in `DATABASE_URL`               |
| `DATABASE_URL`             | —                      | Full PostgreSQL connection string — must be consistent with `POSTGRES_*` vars   |
| `BETTER_AUTH_SECRET`       | —                      | Auth signing secret. Must be changed in production (min 32 chars)               |
| `BETTER_AUTH_URL`          | —                      | Public URL of the app — used for OAuth redirects                                |
| `CORS_ORIGIN`              | —                      | Allowed CORS origin (single URL)                                                |
| `ADMIN_EMAIL`              | —                      | Admin account email, created on first startup                                   |
| `ADMIN_PASSWORD`           | —                      | Admin account password                                                          |
| `DEFAULT_USER_PASSWORD`    | —                      | Default password assigned to newly seeded users                                 |
| `ENCRYPTION_KEY`           | —                      | 64-char hex key for encrypting AI provider credentials in the DB                |
| `GITHUB_COPILOT_CLIENT_ID` | `Iv1.b507a08c87ecfe98` | GitHub OAuth App Client ID for Copilot integration                              |
| `VITE_SERVER_URL`          | —                      | Public API URL as seen by the browser — **baked into the bundle at build time** |
| `NODE_ENV`                 | `development`          | Set to `production` in Docker                                                   |

---

## Troubleshooting

| Issue                                                         | Solution                                                                                                       |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `connection refused` on port 5432                             | PostgreSQL not running — run `bun run db:start`                                                                |
| `BETTER_AUTH_SECRET must be at least 32 characters`           | Generate a proper secret: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`           |
| `ENCRYPTION_KEY must be a 64-character hex string`            | Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`                           |
| Frontend still calls old URL after changing `VITE_SERVER_URL` | `VITE_SERVER_URL` is baked in at build time — rebuild: `docker compose up -d --build`                          |
| CORS errors in browser                                        | Ensure `CORS_ORIGIN` in `.env.docker` exactly matches the URL you open in the browser                          |
| Auth redirect loop                                            | `BETTER_AUTH_URL` must match the URL you open in the browser (including port)                                  |
| `migrate` container keeps restarting                          | Database credentials mismatch — check `DATABASE_URL` matches `POSTGRES_USER`/`POSTGRES_PASSWORD`/`POSTGRES_DB` |
| GitHub Copilot OAuth not working                              | `BETTER_AUTH_URL` must be publicly reachable for the OAuth callback                                            |
