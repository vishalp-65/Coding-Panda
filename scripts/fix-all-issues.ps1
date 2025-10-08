# PowerShell script to fix all service issues

Write-Host "=== AI Coding Platform - Issue Fix Script ===" -ForegroundColor Green
Write-Host ""

# Step 1: Setup databases
Write-Host "Step 1: Setting up databases..." -ForegroundColor Yellow
& "scripts\setup-databases.ps1"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Database setup failed!" -ForegroundColor Red
    exit 1
}

# Step 2: Setup Python services
Write-Host ""
Write-Host "Step 2: Setting up Python services..." -ForegroundColor Yellow
& "scripts\setup-python-services.ps1"

# Step 3: Install Node.js dependencies
Write-Host ""
Write-Host "Step 3: Installing Node.js dependencies..." -ForegroundColor Yellow
npm install

# Step 4: Build shared packages
Write-Host ""
Write-Host "Step 4: Building shared packages..." -ForegroundColor Yellow
npm run build --workspace=packages/common
npm run build --workspace=packages/types

Write-Host ""
Write-Host "=== All issues have been fixed! ===" -ForegroundColor Green
Write-Host ""
Write-Host "You can now start all services using:" -ForegroundColor White
Write-Host "  .\start-all-services.ps1" -ForegroundColor Cyan
Write-Host ""
Write-Host "Or start individual services:" -ForegroundColor White
Write-Host "  Node.js services: npm run dev --workspace=services/[service-name]" -ForegroundColor Gray
Write-Host "  Python services: cd services/[service-name] && .\start.ps1" -ForegroundColor Gray