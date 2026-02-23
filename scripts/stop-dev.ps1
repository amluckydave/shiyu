$ErrorActionPreference = "Stop"

function Stop-ManagedService {
  param(
    [Parameter(Mandatory = $true)][pscustomobject]$Service
  )

  if (-not $Service.managed) {
    Write-Host ("Skip {0}: not started by script (PID: {1})" -f $Service.name, $Service.pid)
    return
  }

  if (-not $Service.pid) {
    Write-Host ("Skip {0}: missing PID in state file" -f $Service.name)
    return
  }

  try {
    $proc = Get-Process -Id ([int]$Service.pid) -ErrorAction Stop
    Stop-Process -Id $proc.Id -Force
    Write-Host ("Stopped {0} (PID: {1})" -f $Service.name, $proc.Id) -ForegroundColor Green
  } catch {
    Write-Host ("{0} process not found or already exited (PID: {1})" -f $Service.name, $Service.pid)
  }
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootDir = Split-Path -Parent $scriptDir
$stateFile = Join-Path $rootDir ".codex\dev-services.json"

if (-not (Test-Path $stateFile)) {
  Write-Host "State file not found. Services may not have been started via this script."
  exit 0
}

$state = Get-Content -Path $stateFile -Raw | ConvertFrom-Json

Stop-ManagedService -Service $state.web
Stop-ManagedService -Service $state.api

Remove-Item -Path $stateFile -Force
Write-Host "Removed state file: .codex/dev-services.json"
