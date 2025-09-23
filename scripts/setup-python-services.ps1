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
        
        # Remove existing virtual environment if it exists
        if (Test-Path ".venv") {
            Write-Host "Removing existing virtual environment..." -ForegroundColor Gray
            Remove-Item -Recurse -Force ".venv"
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