# Health Check Script for AI Coding Platform

Write-Host "AI Coding Platform - Health Check" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green

# Function to check service health
function Test-ServiceHealth {
    param(
        [string]$ServiceName,
        [string]$Url,
        [int]$ExpectedStatus = 200
    )
    
    try {
        $response = Invoke-WebRequest -Uri $Url -Method GET -TimeoutSec 10 -UseBasicParsing
        if ($response.StatusCode -eq $ExpectedStatus) {
            Write-Host "✓ $ServiceName" -ForegroundColor Green -NoNewline
            Write-Host " - Healthy" -ForegroundColor Gray
            return $true
        } else {
            Write-Host "✗ $ServiceName" -ForegroundColor Red -NoNewline
            Write-Host " - Status: $($response.StatusCode)" -ForegroundColor Gray
            return $false
        }
    }
    catch {
        Write-Host "✗ $ServiceName" -ForegroundColor Red -NoNewline
        Write-Host " - Error: $($_.Exception.Message)" -ForegroundColor Gray
        return $false
    }
}

# Function to check port availability
function Test-Port {
    param([string]$Host, [int]$Port)
    try {
        $connection = New-Object System.Net.Sockets.TcpClient
        $connection.Connect($Host, $Port)
        $connection.Close()
        return $true
    }
    catch {
        return $false
    }
}

Write-Host "`nChecking Infrastructure Services..." -ForegroundColor Cyan
$infraHealthy = 0
$infraTotal = 4

if (Test-Port "localhost" 5432) {
    Write-Host "✓ PostgreSQL" -ForegroundColor Green -NoNewline
    Write-Host " - Port 5432 accessible" -ForegroundColor Gray
    $infraHealthy++
} else {
    Write-Host "✗ PostgreSQL" -ForegroundColor Red -NoNewline
    Write-Host " - Port 5432 not accessible" -ForegroundColor Gray
}

if (Test-Port "localhost" 27017) {
    Write-Host "✓ MongoDB" -ForegroundColor Green -NoNewline
    Write-Host " - Port 27017 accessible" -ForegroundColor Gray
    $infraHealthy++
} else {
    Write-Host "✗ MongoDB" -ForegroundColor Red -NoNewline
    Write-Host " - Port 27017 not accessible" -ForegroundColor Gray
}

if (Test-Port "localhost" 6379) {
    Write-Host "✓ Redis" -ForegroundColor Green -NoNewline
    Write-Host " - Port 6379 accessible" -ForegroundColor Gray
    $infraHealthy++
} else {
    Write-Host "✗ Redis" -ForegroundColor Red -NoNewline
    Write-Host " - Port 6379 not accessible" -ForegroundColor Gray
}

if (Test-Port "localhost" 5672) {
    Write-Host "✓ RabbitMQ" -ForegroundColor Green -NoNewline
    Write-Host " - Port 5672 accessible" -ForegroundColor Gray
    $infraHealthy++
} else {
    Write-Host "✗ RabbitMQ" -ForegroundColor Red -NoNewline
    Write-Host " - Port 5672 not accessible" -ForegroundColor Gray
}

Write-Host "`nChecking Application Services..." -ForegroundColor Cyan
$appHealthy = 0
$appTotal = 9

# Define services with their health endpoints
$services = @(
    @{ Name = "API Gateway"; Url = "http://localhost:8080/api/v1/health" },
    @{ Name = "User Service"; Url = "http://localhost:3006/api/v1/health" },
    @{ Name = "Problem Service"; Url = "http://localhost:3002/api/v1/health" },
    @{ Name = "Contest Service"; Url = "http://localhost:3003/api/v1/health" },
    @{ Name = "Code Execution Service"; Url = "http://localhost:3004/api/v1/health" },
    @{ Name = "Analytics Service"; Url = "http://localhost:3005/api/v1/health" },
    @{ Name = "Notification Service"; Url = "http://localhost:3007/api/v1/health" },
    @{ Name = "Realtime Service"; Url = "http://localhost:3008/api/v1/health" },
    @{ Name = "AI Analysis Service"; Url = "http://localhost:8001/api/v1/health" }
)

foreach ($service in $services) {
    if (Test-ServiceHealth -ServiceName $service.Name -Url $service.Url) {
        $appHealthy++
    }
}

Write-Host "`nChecking Frontend..." -ForegroundColor Cyan
$frontendHealthy = 0
$frontendTotal = 1

if (Test-Port "localhost" 3000) {
    Write-Host "✓ Frontend" -ForegroundColor Green -NoNewline
    Write-Host " - Port 3000 accessible" -ForegroundColor Gray
    $frontendHealthy++
} else {
    Write-Host "✗ Frontend" -ForegroundColor Red -NoNewline
    Write-Host " - Port 3000 not accessible" -ForegroundColor Gray
}

Write-Host "`nChecking Monitoring Services..." -ForegroundColor Cyan
$monitoringHealthy = 0
$monitoringTotal = 3

if (Test-Port "localhost" 9090) {
    Write-Host "✓ Prometheus" -ForegroundColor Green -NoNewline
    Write-Host " - Port 9090 accessible" -ForegroundColor Gray
    $monitoringHealthy++
} else {
    Write-Host "✗ Prometheus" -ForegroundColor Red -NoNewline
    Write-Host " - Port 9090 not accessible" -ForegroundColor Gray
}

if (Test-Port "localhost" 3001) {
    Write-Host "✓ Grafana" -ForegroundColor Green -NoNewline
    Write-Host " - Port 3001 accessible" -ForegroundColor Gray
    $monitoringHealthy++
} else {
    Write-Host "✗ Grafana" -ForegroundColor Red -NoNewline
    Write-Host " - Port 3001 not accessible" -ForegroundColor Gray
}

if (Test-Port "localhost" 8025) {
    Write-Host "✓ MailHog" -ForegroundColor Green -NoNewline
    Write-Host " - Port 8025 accessible" -ForegroundColor Gray
    $monitoringHealthy++
} else {
    Write-Host "✗ MailHog" -ForegroundColor Red -NoNewline
    Write-Host " - Port 8025 not accessible" -ForegroundColor Gray
}

# Summary
Write-Host "`n" + "="*50 -ForegroundColor Green
Write-Host "HEALTH CHECK SUMMARY" -ForegroundColor Green
Write-Host "="*50 -ForegroundColor Green

Write-Host "Infrastructure Services: $infraHealthy/$infraTotal" -ForegroundColor $(if ($infraHealthy -eq $infraTotal) { "Green" } else { "Red" })
Write-Host "Application Services:    $appHealthy/$appTotal" -ForegroundColor $(if ($appHealthy -eq $appTotal) { "Green" } else { "Red" })
Write-Host "Frontend:                $frontendHealthy/$frontendTotal" -ForegroundColor $(if ($frontendHealthy -eq $frontendTotal) { "Green" } else { "Red" })
Write-Host "Monitoring Services:     $monitoringHealthy/$monitoringTotal" -ForegroundColor $(if ($monitoringHealthy -eq $monitoringTotal) { "Green" } else { "Red" })

$totalHealthy = $infraHealthy + $appHealthy + $frontendHealthy + $monitoringHealthy
$totalServices = $infraTotal + $appTotal + $frontendTotal + $monitoringTotal

Write-Host "`nOverall Status: $totalHealthy/$totalServices services healthy" -ForegroundColor $(if ($totalHealthy -eq $totalServices) { "Green" } else { "Red" })

if ($totalHealthy -eq $totalServices) {
    Write-Host "`n🎉 All services are healthy and running!" -ForegroundColor Green
    Write-Host "You can access the application at: http://localhost:3000" -ForegroundColor Cyan
} else {
    Write-Host "`n⚠️  Some services are not healthy. Please check the logs." -ForegroundColor Yellow
    Write-Host "Run the startup script again or check individual service logs." -ForegroundColor Gray
}

Write-Host "`nPress any key to continue..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")