param(
  [switch]$NoMinimizeStarterWindow
)

$ErrorActionPreference = "Stop"

Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class WindowStateApi {
  [DllImport("user32.dll")]
  public static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);
}
"@

function Hide-CurrentWindow {
  try {
    $current = Get-Process -Id $PID -ErrorAction Stop
    if ($current.MainWindowHandle -ne 0) {
      [WindowStateApi]::ShowWindowAsync($current.MainWindowHandle, 2) | Out-Null
    }
  }
  catch {
  }
}

function Get-ListeningProcessId {
  param(
    [Parameter(Mandatory = $true)][int]$Port
  )

  $connection = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
  Where-Object { $_.LocalPort -eq $Port } |
  Select-Object -First 1

  if (-not $connection) {
    return $null
  }

  return [int]$connection.OwningProcess
}

function Wait-ForPort {
  param(
    [Parameter(Mandatory = $true)][int]$Port,
    [Parameter(Mandatory = $true)][int]$TimeoutSeconds
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    $listeningPid = Get-ListeningProcessId -Port $Port
    if ($listeningPid) {
      return $listeningPid
    }

    Start-Sleep -Milliseconds 300
  }

  throw "Port $Port did not become ready in $TimeoutSeconds seconds."
}

function Start-ServiceIfNeeded {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][int]$Port,
    [Parameter(Mandatory = $true)][string[]]$Arguments,
    [Parameter(Mandatory = $true)][string]$Workdir,
    [Parameter(Mandatory = $true)][string]$OutLog,
    [Parameter(Mandatory = $true)][string]$ErrLog
  )

  $existingPid = Get-ListeningProcessId -Port $Port
  if ($existingPid) {
    return [ordered]@{
      name    = $Name
      port    = $Port
      pid     = $existingPid
      managed = $false
      status  = "already-running"
      outLog  = $OutLog
      errLog  = $ErrLog
    }
  }

  Start-Process -FilePath "pnpm.cmd" `
    -ArgumentList $Arguments `
    -WorkingDirectory $Workdir `
    -RedirectStandardOutput $OutLog `
    -RedirectStandardError $ErrLog `
    -WindowStyle Minimized `
    -PassThru | Out-Null

  $listenPid = Wait-ForPort -Port $Port -TimeoutSeconds 30

  return [ordered]@{
    name    = $Name
    port    = $Port
    pid     = $listenPid
    managed = $true
    status  = "started"
    outLog  = $OutLog
    errLog  = $ErrLog
  }
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootDir = Split-Path -Parent $scriptDir
$codexDir = Join-Path $rootDir ".codex"

if (-not (Test-Path $codexDir)) {
  New-Item -ItemType Directory -Path $codexDir | Out-Null
}

$stateFile = Join-Path $codexDir "dev-services.json"
$webOutLog = Join-Path $codexDir "web-dev.out.log"
$webErrLog = Join-Path $codexDir "web-dev.err.log"
$apiOutLog = Join-Path $codexDir "api-dev.out.log"
$apiErrLog = Join-Path $codexDir "api-dev.err.log"

$web = Start-ServiceIfNeeded `
  -Name "web" `
  -Port 5173 `
  -Arguments @("-C", "apps/web", "dev", "--host", "0.0.0.0", "--port", "5173") `
  -Workdir $rootDir `
  -OutLog $webOutLog `
  -ErrLog $webErrLog

$api = Start-ServiceIfNeeded `
  -Name "api" `
  -Port 3100 `
  -Arguments @("-C", "apps/api", "dev") `
  -Workdir $rootDir `
  -OutLog $apiOutLog `
  -ErrLog $apiErrLog

$state = [ordered]@{
  updatedAt = (Get-Date).ToString("o")
  rootDir   = $rootDir
  web       = $web
  api       = $api
}

$state | ConvertTo-Json -Depth 5 | Set-Content -Path $stateFile -Encoding UTF8

Write-Host ""
Write-Host "Services are ready:" -ForegroundColor Green
Write-Host ("- Web: http://localhost:{0}  (PID: {1}, {2})" -f $web.port, $web.pid, $web.status)
Write-Host ("- API: http://localhost:{0}  (PID: {1}, {2})" -f $api.port, $api.pid, $api.status)
Write-Host ""
Write-Host "Log files:"
Write-Host ("- {0}" -f $webOutLog)
Write-Host ("- {0}" -f $webErrLog)
Write-Host ("- {0}" -f $apiOutLog)
Write-Host ("- {0}" -f $apiErrLog)

if (-not $NoMinimizeStarterWindow) {
  Hide-CurrentWindow
}
