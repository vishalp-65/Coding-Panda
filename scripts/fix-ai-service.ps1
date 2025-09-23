# PowerShell script to fix AI Analysis Service dependencies

Write-Host "Fixing AI Analysis Service dependencies..." -ForegroundColor Green

# Navigate to AI Analysis Service directory
Set-Location "services\ai-analysis-service"

# Check if virtual environment exists
if (-not (Test-Path ".venv")) {
    Write-Host "Creating virtual environment..." -ForegroundColor Yellow
    python -m venv .venv
}

# Activate virtual environment
Write-Host "Activating virtual environment..." -ForegroundColor Yellow
& ".venv\Scripts\Activate.ps1"

# Upgrade pip and install build tools first
Write-Host "Upgrading pip and installing build tools..." -ForegroundColor Yellow
& ".venv\Scripts\python.exe" -m pip install --upgrade pip setuptools wheel

# Install Microsoft Visual C++ Build Tools dependencies
Write-Host "Installing basic dependencies..." -ForegroundColor Yellow
& ".venv\Scripts\python.exe" -m pip install numpy pandas

# Install PyTorch with CPU-only version (faster and smaller)
Write-Host "Installing PyTorch CPU version..." -ForegroundColor Yellow
& ".venv\Scripts\python.exe" -m pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu

# Install remaining requirements
Write-Host "Installing remaining requirements..." -ForegroundColor Yellow
& ".venv\Scripts\python.exe" -m pip install -r requirements.txt

Write-Host "AI Analysis Service dependencies fixed!" -ForegroundColor Green

# Return to root directory
Set-Location "..\..\"