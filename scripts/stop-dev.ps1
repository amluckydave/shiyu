# stop-dev.ps1 — 停止所有开发服务 (按端口查找进程)
$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootDir = Split-Path -Parent $scriptDir
$codexDir = Join-Path $rootDir ".codex"
$stateFile = Join-Path $codexDir "dev-services.json"

function Stop-ServiceByPort {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][int]$Port
  )

  $connections = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
  Where-Object { $_.LocalPort -eq $Port }

  if (-not $connections) {
    Write-Host ("  {0} (port {1}): not running" -f $Name, $Port) -ForegroundColor DarkGray
    return
  }

  $pids = $connections | Select-Object -ExpandProperty OwningProcess -Unique

  foreach ($p in $pids) {
    try {
      Stop-Process -Id $p -Force -ErrorAction Stop
      Write-Host ("  {0} (port {1}, PID {2}): stopped" -f $Name, $Port, $p) -ForegroundColor Yellow
    }
    catch {
      Write-Host ("  {0} (port {1}, PID {2}): already exited" -f $Name, $Port, $p) -ForegroundColor DarkGray
    }
  }
}

Write-Host ""
Write-Host "Stopping dev services..." -ForegroundColor Cyan

Stop-ServiceByPort -Name "Web" -Port 5173
Stop-ServiceByPort -Name "API" -Port 3100

# Clean up state file
if (Test-Path $stateFile) {
  Remove-Item $stateFile -Force
}

# Clear log files
$logFiles = @("web-dev.out.log", "web-dev.err.log", "api-dev.out.log", "api-dev.err.log")
foreach ($log in $logFiles) {
  $logPath = Join-Path $codexDir $log
  if (Test-Path $logPath) {
    try { Clear-Content $logPath -ErrorAction Stop } catch { }
  }
}

Write-Host ""
Write-Host "All services stopped. Log files cleared." -ForegroundColor Green
Write-Host ""
