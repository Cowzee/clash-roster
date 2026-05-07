$ErrorActionPreference = "Stop"

$vite = $null
$startedVite = $false
$viteUrl = "http://127.0.0.1:5173"
$existingVite = Get-NetTCPConnection -LocalAddress "127.0.0.1" -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue

if ($existingVite) {
  Write-Host "Using existing Vite server at $viteUrl"
} else {
  Write-Host "Starting Vite..."
  $vite = Start-Process npm.cmd -ArgumentList "run", "dev", "--", "--host", "127.0.0.1", "--strictPort" -PassThru -WindowStyle Hidden
  $startedVite = $true
}

try {
  $ready = $false

  for ($i = 0; $i -lt 60; $i++) {
    try {
      $response = Invoke-WebRequest -Uri $viteUrl -UseBasicParsing -TimeoutSec 1
      if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
        $ready = $true
        break
      }
    } catch {
      Start-Sleep -Milliseconds 500
    }
  }

  if (-not $ready) {
    throw "Vite did not start on $viteUrl"
  }

  Write-Host "Vite is ready. Starting Electron..."
  Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue
  & ".\node_modules\.bin\electron.cmd" "."
} finally {
  if ($startedVite) {
    Write-Host "Stopping Vite..."
    if ($vite -and -not $vite.HasExited) {
      Stop-Process -Id $vite.Id -Force -ErrorAction SilentlyContinue
    }

    $viteListener = Get-NetTCPConnection -LocalAddress "127.0.0.1" -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue
    if ($viteListener) {
      Stop-Process -Id $viteListener.OwningProcess -Force -ErrorAction SilentlyContinue
    }
  }
}
