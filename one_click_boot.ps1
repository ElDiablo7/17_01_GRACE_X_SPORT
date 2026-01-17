param(
  [int]$Port = 3002
)

Write-Host "== One-Click Boot =="

try {
  Write-Host "Killing existing Node processes..."
  Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
} catch {}

try {
  Write-Host "Clearing npm cache..."
  $npmCache = Join-Path $env:LOCALAPPDATA "npm-cache"
  if (Test-Path $npmCache) { Remove-Item -Recurse -Force $npmCache -ErrorAction SilentlyContinue }
  npm cache clean --force | Out-Null
} catch {}

Write-Host "Setting environment and starting server..."
Set-Location $PSScriptRoot
$env:PORT = "$Port"
$env:PUBLIC_MODE = "true"

# Start backend in a new PowerShell so this window stays free
Start-Process powershell -ArgumentList "-NoProfile","-ExecutionPolicy","Bypass","-Command","Set-Location `"$PSScriptRoot`"; `$env:PORT='$Port'; `$env:PUBLIC_MODE='true'; npm start"

Start-Sleep -Seconds 2

Write-Host "Opening app and health endpoints..."
Start-Process "http://localhost:$Port/"
Start-Process "http://localhost:$Port/api/health"
Start-Process "http://localhost:$Port/api/brain/verify"

Write-Host "Done. If the browser doesn’t open, visit http://localhost:$Port/"
