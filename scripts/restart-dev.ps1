# restart-dev.ps1 — 重启所有开发服务
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "=== Restarting dev services ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Stop
& (Join-Path $scriptDir "stop-dev.ps1")

# Step 2: Wait a moment for ports to free up
Start-Sleep -Seconds 1

# Step 3: Start
& (Join-Path $scriptDir "start-dev.ps1")
