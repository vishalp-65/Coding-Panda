# PowerShell script to start AI Analysis Service

Write-Host "Starting AI Analysis Service..." -ForegroundColor Green

# Check if virtual environment exists
if (-not (Test-Path ".venv")) {
    Write-Host "Virtual environment not found. Please run setup-python-services.ps1 first." -ForegroundColor Red
    exit 1
}

# Check if Python executable exists in virtual environment
if (-not (Test-Path ".venv\Scripts\python.exe")) {
    Write-Host "Python executable not found in virtual environment. Please run setup-python-services.ps1 first." -ForegroundColor Red
    exit 1
}

# Activate virtual environment and start the service
Write-Host "Activating virtual environment and starting service..." -ForegroundColor Yellow
& ".venv\Scripts\python.exe" -m uvicorn main:app --host 0.0.0.0 --port 8001 --reload