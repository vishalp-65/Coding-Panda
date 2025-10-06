# Start all services for AI Coding Platform

Write-Host "Starting AI Coding Platform Services..." -ForegroundColor Green

# Function to check if a port is in use
function Test-Port {
    param([int]$Port)
    try {
        $connection = New-Object System.Net.Sockets.TcpClient
        $connection.Connect("localhost", $Port)
        $connection.Close()
        return $true
    }
    catch {
        return $false
    }
}

# Function to start a service in a new PowerShell window
function Start-Service {
    param(
        [string]$ServiceName,
        [string]$Path,
        [string]$Command,
        [int]$Port
    )
    
    Write-Host "Starting $ServiceName on port $Port..." -ForegroundColor Yellow
    
    if (Test-Port -Port $Port) {
        Write-Host "$ServiceName is already running on port $Port" -ForegroundColor Red
        return
    }
    
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$Path'; $Command" -WindowStyle Normal
    Start-Sleep -Seconds 1
}

# Start infrastructure services first
Write-Host "Starting infrastructure services..." -ForegroundColor Cyan
docker-compose up -d postgres mongodb redis rabbitmq prometheus grafana mailhog

# Wait for infrastructure to be ready
Write-Host "Waiting for infrastructure services to be ready..." -ForegroundColor Cyan
Start-Sleep -Seconds 3

# Start application services in correct order
Write-Host "Starting core services..." -ForegroundColor Cyan
Start-Service "User Service" "services/user-service" "npm run dev" 3006
Start-Service "Problem Service" "services/problem-service" "npm run dev" 3002
Start-Service "Contest Service" "services/contest-service" "npm run dev" 3003
Start-Service "Analytics Service" "services/analytics-service" "npm run dev" 3005
Start-Service "Notification Service" "services/notification-service" "npm run dev" 3007
Start-Service "Realtime Service" "services/realtime-service" "npm run dev" 3008

# Start Python services
Write-Host "Starting Python services..." -ForegroundColor Cyan
Start-Service "Code Execution Service" "services/code-execution-service" ".\start.ps1" 3004
Start-Service "AI Analysis Service" "services/ai-analysis-service" ".\start.ps1" 8001

# Wait for services to initialize
Write-Host "Waiting for services to initialize..." -ForegroundColor Cyan
Start-Sleep -Seconds 3

# Start API Gateway (depends on other services)
Start-Service "API Gateway" "services/api-gateway" "npm run dev" 8080

# Wait for API Gateway to be ready
Start-Sleep -Seconds 2

# Start frontend (depends on API Gateway)
Start-Service "Frontend" "apps/frontend" "npm run dev" 3000

Write-Host "`n=== AI Coding Platform Started Successfully! ===" -ForegroundColor Green
Write-Host "`nService URLs:" -ForegroundColor Cyan
Write-Host "Frontend:              http://localhost:3000" -ForegroundColor White
Write-Host "API Gateway:           http://localhost:8080" -ForegroundColor White
Write-Host "User Service:          http://localhost:3006/api/v1/health" -ForegroundColor White
Write-Host "Problem Service:       http://localhost:3002/api/v1/health" -ForegroundColor White
Write-Host "Contest Service:       http://localhost:3003/api/v1/health" -ForegroundColor White
Write-Host "Code Execution:        http://localhost:3004/api/v1/health" -ForegroundColor White
Write-Host "Analytics Service:     http://localhost:3005/api/v1/health" -ForegroundColor White
Write-Host "Notification Service:  http://localhost:3007/api/v1/health" -ForegroundColor White
Write-Host "Realtime Service:      http://localhost:3008/api/v1/health" -ForegroundColor White
Write-Host "AI Analysis Service:   http://localhost:8001/api/v1/health" -ForegroundColor White

Write-Host "`nMonitoring & Tools:" -ForegroundColor Cyan
Write-Host "Grafana Dashboard:     http://localhost:3001 (admin/admin)" -ForegroundColor White
Write-Host "Prometheus:            http://localhost:9090" -ForegroundColor White
Write-Host "RabbitMQ Management:   http://localhost:15672 (rabbitmq/rabbitmq)" -ForegroundColor White
Write-Host "MailHog (Email):       http://localhost:8025" -ForegroundColor White

Write-Host "`nAll services are now running with standardized /api/v1/health endpoints!" -ForegroundColor Green
Write-Host "WebSocket connections are configured to use port 3008" -ForegroundColor Green
Write-Host "`nPress any key to continue..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")