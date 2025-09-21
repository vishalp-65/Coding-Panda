# AI Coding Platform - Complete Service Startup Script

Write-Host "Starting AI Coding Platform Services..." -ForegroundColor Green

# Start Docker infrastructure
Write-Host "1. Starting Docker infrastructure..." -ForegroundColor Yellow
docker-compose up -d

# Wait for services to be ready
Write-Host "2. Waiting for infrastructure services to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Build shared packages
Write-Host "3. Building shared packages..." -ForegroundColor Yellow
npm run build --workspace=packages/common
npm run build --workspace=packages/types

# Start Node.js services in background
Write-Host "4. Starting Node.js services..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-Command", "npm run dev --workspace=services/api-gateway" -WindowStyle Minimized
Start-Process powershell -ArgumentList "-Command", "npm run dev --workspace=services/user-service" -WindowStyle Minimized
Start-Process powershell -ArgumentList "-Command", "npm run dev --workspace=services/problem-service" -WindowStyle Minimized
Start-Process powershell -ArgumentList "-Command", "npm run dev --workspace=services/contest-service" -WindowStyle Minimized

# Start Python services
Write-Host "5. Starting Python services..." -ForegroundColor Yellow

# AI Analysis Service
Write-Host "   Starting AI Analysis Service..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-Command", "cd services\ai-analysis-service; if (!(Test-Path venv)) { python -m venv venv }; venv\Scripts\activate; pip install -r requirements.txt; if (!(Test-Path .env)) { copy .env.example .env }; uvicorn src.main:app --reload --host 0.0.0.0 --port 8001" -WindowStyle Minimized

# Code Execution Service
Write-Host "   Starting Code Execution Service..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-Command", "cd services\code-execution-service; if (!(Test-Path venv)) { python -m venv venv }; venv\Scripts\activate; pip install -r requirements.txt; if (!(Test-Path .env)) { copy .env.example .env }; uvicorn src.main:app --reload --host 0.0.0.0 --port 8000" -WindowStyle Minimized

Write-Host "6. All services are starting up..." -ForegroundColor Green
Write-Host ""
Write-Host "Service URLs:" -ForegroundColor White
Write-Host "  API Gateway:           http://localhost:3000" -ForegroundColor Gray
Write-Host "  User Service:          http://localhost:3006" -ForegroundColor Gray
Write-Host "  Problem Service:       http://localhost:3002" -ForegroundColor Gray
Write-Host "  Code Execution:        http://localhost:8000" -ForegroundColor Gray
Write-Host "  AI Analysis:           http://localhost:8001" -ForegroundColor Gray
Write-Host "  Contest Service:       http://localhost:3003" -ForegroundColor Gray
Write-Host ""
Write-Host "Infrastructure:" -ForegroundColor White
Write-Host "  PostgreSQL:            localhost:5432" -ForegroundColor Gray
Write-Host "  MongoDB:               localhost:27017" -ForegroundColor Gray
Write-Host "  Redis:                 localhost:6379" -ForegroundColor Gray
Write-Host "  RabbitMQ Management:   http://localhost:15672" -ForegroundColor Gray
Write-Host "  Grafana:               http://localhost:3001" -ForegroundColor Gray
Write-Host "  MailHog:               http://localhost:8025" -ForegroundColor Gray
Write-Host ""
Write-Host "All services should be ready in 30-60 seconds!" -ForegroundColor Green