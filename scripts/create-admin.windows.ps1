# Create admin account (default: admin@ewoosoft.com / admin@123)
# PowerShell — run via: .\scripts\create-admin.windows.ps1  or  scripts\create-admin.cmd
#
#   .\scripts\create-admin.windows.ps1
#   .\scripts\create-admin.windows.ps1 -Email "admin@ewoosoft.com" -Password "admin@123"
#   .\scripts\create-admin.windows.ps1 -Docker

param(
  [string]$Email = "admin@ewoosoft.com",
  [string]$Password = "Admin@123",
  [switch]$Docker,
  [switch]$Local
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

function Get-ComposeEnvArgs {
  if (Test-Path (Join-Path $Root ".env.docker")) {
    return @("--env-file", ".env.docker")
  }
  return @()
}

function Invoke-CreateAdminDocker {
  Push-Location $Root
  try {
    $envArgs = Get-ComposeEnvArgs
    Write-Host "Using migrate container (postgres must be reachable)..."
    docker compose @envArgs run --rm migrate `
      sh -c "cd /app/apps/server && bun src/scripts/create-admin.ts $Email $Password"
  } finally {
    Pop-Location
  }
}

function Invoke-CreateAdminLocal {
  $bun = Get-Command bun -ErrorAction SilentlyContinue
  if (-not $bun) {
    Write-Error "bun is not installed. Install from https://bun.sh or run with -Docker"
  }
  Push-Location (Join-Path $Root "apps\server")
  try {
    & bun src/scripts/create-admin.ts $Email $Password
  } finally {
    Pop-Location
  }
}

$useDocker = $Docker.IsPresent
if (-not $useDocker -and -not $Local.IsPresent) {
  $useDocker = -not (Get-Command bun -ErrorAction SilentlyContinue)
  if ($useDocker) {
    Write-Host "Note: bun not in PATH — using Docker."
  }
}

if ($useDocker) {
  Invoke-CreateAdminDocker
} else {
  Invoke-CreateAdminLocal
}
