Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "  Starting MuleNet Financial Forensics Engine Backend" -ForegroundColor Green
Write-Host "===================================================" -ForegroundColor Cyan

$backendDir = Join-Path $PSScriptRoot "backend"
Set-Location $backendDir
& ".\venv\Scripts\python.exe" "run.py"
