# PowerShell script to set up all databases

Write-Host "Setting up databases for AI Coding Platform..." -ForegroundColor Green

# Check if Docker is running
Write-Host "1. Checking Docker status..." -ForegroundColor Yellow
try {
    docker info | Out-Null
    Write-Host "   Docker is running!" -ForegroundColor Green
} catch {
    Write-Host "   Docker is not running. Please start Docker first." -ForegroundColor Red
    exit 1
}

# Start database containers if not running
Write-Host "2. Starting database containers..." -ForegroundColor Yellow
docker-compose up -d postgres mongodb redis

# Wait for PostgreSQL to be ready
Write-Host "3. Waiting for PostgreSQL to be ready..." -ForegroundColor Yellow
$maxAttempts = 30
$attempt = 0
do {
    $attempt++
    try {
        docker exec ai-platform-postgres pg_isready -U postgres | Out-Null
        Write-Host "   PostgreSQL is ready!" -ForegroundColor Green
        break
    } catch {
        if ($attempt -eq $maxAttempts) {
            Write-Host "   PostgreSQL failed to start after $maxAttempts attempts." -ForegroundColor Red
            exit 1
        }
        Write-Host "   Waiting for PostgreSQL... (attempt $attempt/$maxAttempts)" -ForegroundColor Gray
        Start-Sleep -Seconds 2
    }
} while ($attempt -lt $maxAttempts)

# Initialize databases
Write-Host "4. Initializing databases..." -ForegroundColor Yellow

# Run main initialization script
Write-Host "   Running main database initialization..." -ForegroundColor Cyan
docker exec ai-platform-postgres psql -U postgres -f /docker-entrypoint-initdb.d/01-init-db.sql

# Run contest service initialization
Write-Host "   Setting up contest service database..." -ForegroundColor Cyan
docker exec ai-platform-postgres psql -U postgres -f /docker-entrypoint-initdb.d/02-init-contest-db.sql

Write-Host "5. Database setup completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Available databases:" -ForegroundColor White
Write-Host "  - ai_platform (main)" -ForegroundColor Gray
Write-Host "  - user_service" -ForegroundColor Gray
Write-Host "  - contest_service" -ForegroundColor Gray
Write-Host "  - analytics_service" -ForegroundColor Gray
Write-Host "  - ai_platform_analytics" -ForegroundColor Gray
Write-Host ""
Write-Host "Database connection details:" -ForegroundColor White
Write-Host "  Host: localhost" -ForegroundColor Gray
Write-Host "  Port: 5432" -ForegroundColor Gray
Write-Host "  Username: postgres" -ForegroundColor Gray
Write-Host "  Password: postgres" -ForegroundColor Gray