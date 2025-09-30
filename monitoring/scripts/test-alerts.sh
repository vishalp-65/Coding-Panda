#!/bin/bash

# Script to test alerting functionality

set -e

echo "Testing alerting system..."

# Test webhook endpoint
echo "Testing alert webhook..."
curl -X POST http://localhost:3007/api/alerts/webhook \
  -H 'Content-Type: application/json' \
  -d '{
    "version": "4",
    "groupKey": "test-group",
    "status": "firing",
    "receiver": "web.hook",
    "groupLabels": {
      "alertname": "TestAlert"
    },
    "commonLabels": {
      "alertname": "TestAlert",
      "severity": "warning"
    },
    "commonAnnotations": {
      "summary": "Test alert for monitoring system",
      "description": "This is a test alert to verify the alerting system is working"
    },
    "externalURL": "http://localhost:9093",
    "alerts": [
      {
        "status": "firing",
        "labels": {
          "alertname": "TestAlert",
          "severity": "warning",
          "instance": "localhost:3001",
          "job": "api-gateway"
        },
        "annotations": {
          "summary": "Test alert for monitoring system",
          "description": "This is a test alert to verify the alerting system is working"
        },
        "startsAt": "2023-01-01T00:00:00Z",
        "generatorURL": "http://localhost:9090/graph",
        "fingerprint": "test-fingerprint"
      }
    ]
  }'

echo ""
echo "✅ Alert webhook test completed"

# Test metrics endpoints
echo "Testing metrics endpoints..."

services=("api-gateway:3001" "user-service:3002" "problem-service:3003" "notification-service:3007")

for service in "${services[@]}"; do
    IFS=':' read -r name port <<< "$service"
    echo "Testing $name metrics..."
    
    if curl -f "http://localhost:$port/metrics" > /dev/null 2>&1; then
        echo "✅ $name metrics endpoint is working"
    else
        echo "❌ $name metrics endpoint failed"
    fi
done

# Test health endpoints
echo "Testing health endpoints..."

for service in "${services[@]}"; do
    IFS=':' read -r name port <<< "$service"
    echo "Testing $name health..."
    
    if curl -f "http://localhost:$port/health" > /dev/null 2>&1; then
        echo "✅ $name health endpoint is working"
    else
        echo "❌ $name health endpoint failed"
    fi
done

echo ""
echo "✅ All monitoring tests completed!"