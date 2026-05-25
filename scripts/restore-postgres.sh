#!/usr/bin/env sh
# Restore plain SQL into the Docker Postgres used by docker-compose.yml
#
# Usage (from repo root, Postgres container running):
#   ./scripts/restore-postgres.sh [path/to/dump.sql]
# Default file: ./backup.sql
#
# Requires: docker, running container ai_assistant_postgres

set -e
cd "$(dirname "$0")/.."

DUMP="${1:-backup.sql}"
if [ ! -f "$DUMP" ]; then
  echo "File not found: $DUMP" >&2
  exit 1
fi

first_line=$(head -n 1 "$DUMP" || true)
case "$first_line" in
  pg_dump:*)
    echo "This file is not a SQL dump — it is a pg_dump error message (stderr was saved as backup.sql)." >&2
    cat <<'EOF' >&2
Create a real dump from a working database, e.g.:
  docker exec ai_assistant_postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --no-acl' > backup.sql
EOF
    exit 1
    ;;
esac

if ! docker ps --format '{{.Names}}' | grep -qx 'ai_assistant_postgres'; then
  echo "Start Postgres first, e.g.:" >&2
  echo "  docker compose --env-file .env.docker up -d postgres" >&2
  exit 1
fi

USER=$(docker exec ai_assistant_postgres printenv POSTGRES_USER)
DB=$(docker exec ai_assistant_postgres printenv POSTGRES_DB)

echo "Restoring $DUMP into database \"$DB\" as user \"$USER\"..."
docker exec -i ai_assistant_postgres psql -v ON_ERROR_STOP=1 -U "$USER" -d "$DB" <"$DUMP"
echo "Done."
