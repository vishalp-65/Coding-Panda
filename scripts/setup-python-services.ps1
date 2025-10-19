# PowerShell script to set up Python virtual environments for all Python services

Write-Host "Setting up Python virtual environments for services..." -ForegroundColor Green

# Function to setup virtual environment for a service
function Setup-PythonService {
    param(
        [string]$ServicePath,
        [string]$ServiceName
    )
    
    Write-Host "Setting up $ServiceName..." -ForegroundColor Yellow
    
    if (Test-Path $ServicePath) {
        Push-Location $ServicePath
        
        # Remove existing virtual environment if it exists and is not in use
        if (Test-Path ".venv") {
            Write-Host "Checking existing virtual environment..." -ForegroundColor Gray
            try {
                Remove-Item -Recurse -Force ".venv" -ErrorAction Stop
                Write-Host "Removed existing virtual environment" -ForegroundColor Gray
            }
            catch {
                Write-Host "Cannot remove existing virtual environment (may be in use). Trying to update instead..." -ForegroundColor Yellow
                if (Test-Path ".venv\Scripts\python.exe") {
                    Write-Host "Virtual environment exists and appears functional. Updating dependencies..." -ForegroundColor Gray
                    & ".venv\Scripts\python.exe" -m pip install --upgrade pip
                    & ".venv\Scripts\python.exe" -m pip install -r requirements.txt
                    Write-Host "$ServiceName dependencies updated!" -ForegroundColor Green
                    Pop-Location
                    return
                }
            }
        }
        
        # Create new virtual environment
        Write-Host "Creating virtual environment..." -ForegroundColor Gray
        python -m venv .venv
        
        # Activate virtual environment and install dependencies
        Write-Host "Installing dependencies..." -ForegroundColor Gray
        & ".venv\Scripts\python.exe" -m pip install --upgrade pip
        & ".venv\Scripts\python.exe" -m pip install -r requirements.txt
        
        Write-Host "$ServiceName setup completed!" -ForegroundColor Green
        Pop-Location
    } else {
        Write-Host "Service path $ServicePath not found!" -ForegroundColor Red
    }
}

# Setup each Python service
Setup-PythonService -ServicePath "services\code-execution-service" -ServiceName "Code Execution Service"
Setup-PythonService -ServicePath "services\ai-analysis-service" -ServiceName "AI Analysis Service"

Write-Host "All Python services setup completed!" -ForegroundColor Green
Write-Host "You can now start the services using the individual start scripts." -ForegroundColor Cyan