#!/usr/bin/env sh
# Create admin account (default: admin@ewoosoft.com / admin@123)
# Git Bash / WSL / Linux / macOS — use this file, NOT create-admin.ps1
#
#   ./scripts/create-admin.sh
#   ./scripts/create-admin
#   ./scripts/create-admin.sh admin@ewoosoft.com admin@123
#   ./scripts/create-admin.sh --docker
#   ./scripts/create-admin.sh --local   # require bun in PATH
#
# Without bun installed, automatically uses Docker (migrate image + postgres).

set -e
cd "$(dirname "$0")/.."

MODE="auto"

while [ $# -gt 0 ]; do
  case "$1" in
    --docker) MODE="docker"; shift ;;
    --local) MODE="local"; shift ;;
    -h | --help)
      sed -n '2,10p' "$0"
      exit 0
      ;;
    -*) echo "Unknown option: $1" >&2; exit 1 ;;
    *) break ;;
  esac
done

EMAIL="${1:-admin@ewoosoft.com}"
PASSWORD="${2:-Admin@123}"

compose_env_file() {
  if [ -f .env.docker ]; then
    echo "--env-file .env.docker"
  fi
}

run_local() {
  if ! command -v bun >/dev/null 2>&1; then
    echo "Error: bun is not installed. Install from https://bun.sh or run:" >&2
    echo "  ./scripts/create-admin.sh --docker" >&2
    exit 127
  fi
  cd apps/server
  exec bun src/scripts/create-admin.ts "$EMAIL" "$PASSWORD"
}

run_docker() {
  if ! command -v docker >/dev/null 2>&1; then
    echo "Error: docker is not installed." >&2
    exit 127
  fi

  # shellcheck disable=SC2046
  COMPOSE_FILE_ARGS=$(compose_env_file)

  # Use migrate (builder image) — full monorepo deps; server runtime only ships compiled binaries.
  echo "Using migrate container (postgres must be reachable)..."
  # shellcheck disable=SC2086
  exec docker compose $COMPOSE_FILE_ARGS run --rm migrate \
    sh -c "cd /app/apps/server && bun src/scripts/create-admin.ts \"$EMAIL\" \"$PASSWORD\""
}

case "$MODE" in
  local) run_local ;;
  docker) run_docker ;;
  auto)
    if command -v bun >/dev/null 2>&1; then
      run_local
    else
      echo "Note: bun not in PATH — using Docker."
      run_docker
    fi
    ;;
esac
