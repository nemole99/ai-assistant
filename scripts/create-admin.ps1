#!/usr/bin/env sh
# Git Bash runs .ps1 as shell — this shim forwards to create-admin.sh.
# For PowerShell: use  scripts\create-admin.cmd  or  create-admin.windows.ps1
exec "$(dirname "$0")/create-admin.sh" "$@"
