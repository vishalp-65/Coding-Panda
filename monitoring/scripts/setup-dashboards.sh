#!/bin/bash

# Setup script for monitoring dashboards and alerts

set -e

echo "Setting up monitoring infrastructure..."

# Create necessary directories
mkdir -p /var/log/app
mkdir -p /var/lib/prometheus
mkdir -p /var/lib/grafana

# Set permissions
chmod 755 /var/log/app
chmod 755 /var/lib/prometheus
chmod 755 /var/lib/grafana

# Start monitoring stack
echo "Starting monitoring services..."
docker-compose -f monitoring/docker-compose.yml up -d

# Wait for services to be ready
echo "Waiting for services to start..."
sleep 30

# Check if Prometheus is running
if curl -f http://localhost:9090/-/healthy > /dev/null 2>&1; then
    echo "✅ Prometheus is running"
else
    echo "❌ Prometheus failed to start"
    exit 1
fi

# Check if Grafana is running
if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "✅ Grafana is running"
else
    echo "❌ Grafana failed to start"
    exit 1
fi

# Check if AlertManager is running
if curl -f http://localhost:9093/-/healthy > /dev/null 2>&1; then
    echo "✅ AlertManager is running"
else
    echo "❌ AlertManager failed to start"
    exit 1
fi

# Import Grafana dashboards
echo "Importing Grafana dashboards..."

# Import platform overview dashboard
curl -X POST \
  http://admin:admin@localhost:3000/api/dashboards/db \
  -H 'Content-Type: application/json' \
  -d @monitoring/grafana/dashboards/platform-overview.json

# Import performance monitoring dashboard
curl -X POST \
  http://admin:admin@localhost:3000/api/dashboards/db \
  -H 'Content-Type: application/json' \
  -d @monitoring/grafana/dashboards/performance-monitoring.json

# Import business metrics dashboard
curl -X POST \
  http://admin:admin@localhost:3000/api/dashboards/db \
  -H 'Content-Type: application/json' \
  -d @monitoring/grafana/dashboards/business-metrics.json

# Import security monitoring dashboard
curl -X POST \
  http://admin:admin@localhost:3000/api/dashboards/db \
  -H 'Content-Type: application/json' \
  -d @monitoring/grafana/dashboards/security-monitoring.json

echo "✅ Monitoring infrastructure setup complete!"
echo ""
echo "Access URLs:"
echo "  Grafana:     http://localhost:3000 (admin/admin)"
echo "  Prometheus:  http://localhost:9090"
echo "  AlertManager: http://localhost:9093"
echo "  Jaeger:      http://localhost:16686"
echo ""
echo "Health check endpoints:"
echo "  API Gateway: http://localhost:3001/health"
echo "  User Service: http://localhost:3002/health"
echo "  Problem Service: http://localhost:3003/health"