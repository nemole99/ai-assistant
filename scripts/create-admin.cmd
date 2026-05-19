@echo off
REM Windows CMD entry point
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0create-admin.windows.ps1" %*
