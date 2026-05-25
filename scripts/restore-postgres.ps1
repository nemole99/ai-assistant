# Restore plain SQL into Docker Postgres (ai_assistant_postgres)
# Usage (repo root, PowerShell):
#   .\scripts\restore-postgres.ps1
#   .\scripts\restore-postgres.ps1 -Path D:\backups\my.sql

param(
  [string]$Path = (Join-Path (Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)) "backup.sql")
)

$ErrorActionPreference = "Stop"

$names = docker ps --format '{{.Names}}' 2>$null
if ($names -notcontains "ai_assistant_postgres") {
  Write-Error "Container ai_assistant_postgres is not running. Start with: docker compose --env-file .env.docker up -d postgres"
}

if (-not (Test-Path -LiteralPath $Path)) {
  Write-Error "File not found: $Path"
}

$firstLine = (Get-Content -LiteralPath $Path -TotalCount 1 -ErrorAction SilentlyContinue)
if ($firstLine -match '^\s*pg_dump:') {
  Write-Error "This file is not a SQL dump — it is a pg_dump error message (stderr was saved as backup.sql). Create a real dump from a running Postgres (see docs/SETUP.md, section 2b)."
}

$user = (docker exec ai_assistant_postgres printenv POSTGRES_USER).Trim()
$db = (docker exec ai_assistant_postgres printenv POSTGRES_DB).Trim()

Write-Host "Restoring $Path into database `"$db`" as user `"$user`"..."
Get-Content -LiteralPath $Path -Raw | docker exec -i ai_assistant_postgres psql -v ON_ERROR_STOP=1 -U $user -d $db
Write-Host "Done."
