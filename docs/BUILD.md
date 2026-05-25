# Build & Deploy

Always pass `--env-file .env.docker` — without it, `VITE_SERVER_URL` will be empty at build time and the app will show a blank white page.

```bash
docker compose --env-file .env.docker up -d --build
```

If PostgreSQL and MinIO already run outside Docker and `.env.docker` points to those external services, the app containers will use them directly. The bundled `postgres` and `minio` services are now optional behind the `bundled-infra` profile:

```bash
docker compose --env-file .env.docker up -d --build
```

To run the bundled Postgres + MinIO as well:

```bash
docker compose --env-file .env.docker --profile bundled-infra up -d --build
```

## Resetting the database volume

> **Warning:** this removes all PostgreSQL data. You will need to seed again afterwards.

Do this when: you change `POSTGRES_PASSWORD` / `POSTGRES_USER` in `.env.docker` after the volume was already initialised, or you want a clean DB reset.

```bash
docker compose --env-file .env.docker down -v
docker compose --env-file .env.docker up -d --build
```
