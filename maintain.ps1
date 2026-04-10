# AI Proctoring System - Maintenance & Setup Script (Windows PowerShell)

$ErrorActionPreference = "Stop"

function Write-Header {
    param($Text)
    Write-Host "`n=== $Text ===" -ForegroundColor Cyan
}

Write-Header "Starting System Maintenance"

# 1. Dependency Checks - Backend
Write-Header "Back-end Maintenance (Django)"
Set-Location server

if (-not (Test-Path "venv")) {
    Write-Host "Creating Python virtual environment..." -ForegroundColor Yellow
    python -m venv venv
}

Write-Host "Activating venv and installing requirements..."
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt

Write-Host "Running Database Migrations..."
python manage.py migrate

Write-Host "Collecting Static Files..."
python manage.py collectstatic --noinput

Set-Location ..

# 2. Dependency Checks - Frontend
Write-Header "Front-end Maintenance (React/Vite)"
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing NPM dependencies..." -ForegroundColor Yellow
    npm install
} else {
    Write-Host "Syncing NPM dependencies..."
    npm install
}

Write-Host "Building Production Bundle..."
npm run build

# 3. Security Verification
Write-Header "Security Compliance Check"
if (-not (Test-Path "server\server\proctor_config.json")) {
    Write-Host "WARNING: server\server\proctor_config.json is missing!" -ForegroundColor Red
} else {
    Write-Host "Proctor Configuration Verified." -ForegroundColor Green
}

Write-Host "`nMaintenance Complete. System is ready for Deployment." -ForegroundColor Green
