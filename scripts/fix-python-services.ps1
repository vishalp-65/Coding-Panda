# PowerShell script to fix all Python services issues

Write-Host "=== Fixing Python Services Issues ===" -ForegroundColor Cyan

# Function to fix a Python service
function Fix-PythonService {
    param(
        [string]$ServicePath,
        [string]$ServiceName
    )
    
    Write-Host "`n--- Fixing $ServiceName ---" -ForegroundColor Yellow
    
    # Navigate to service directory
    Set-Location $ServicePath
    
    # Remove existing virtual environment if it has issues
    if (Test-Path ".venv") {
        Write-Host "Removing existing virtual environment..." -ForegroundColor Yellow
        Remove-Item -Recurse -Force ".venv" -ErrorAction SilentlyContinue
    }
    
    # Create fresh virtual environment
    Write-Host "Creating fresh virtual environment..." -ForegroundColor Yellow
    python -m venv .venv
    
    # Activate virtual environment
    Write-Host "Activating virtual environment..." -ForegroundColor Yellow
    & ".venv\Scripts\Activate.ps1"
    
    # Upgrade pip and install build tools
    Write-Host "Upgrading pip and installing build tools..." -ForegroundColor Yellow
    & ".venv\Scripts\python.exe" -m pip install --upgrade pip setuptools wheel
    
    # Install requirements
    Write-Host "Installing requirements..." -ForegroundColor Yellow
    & ".venv\Scripts\python.exe" -m pip install -r requirements.txt
    
    Write-Host "$ServiceName setup completed!" -ForegroundColor Green
    
    # Return to root
    Set-Location "..\..\"
}

# Fix AI Analysis Service
Fix-PythonService -ServicePath "services\ai-analysis-service" -ServiceName "AI Analysis Service"

# Fix Code Execution Service  
Fix-PythonService -ServicePath "services\code-execution-service" -ServiceName "Code Execution Service"

Write-Host "`n=== All Python services fixed! ===" -ForegroundColor Green
Write-Host "You can now start the services using their individual start scripts." -ForegroundColor Cyan