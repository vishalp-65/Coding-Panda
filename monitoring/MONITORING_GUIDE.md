# AI Coding Platform - Monitoring and Observability Guide

## Overview

This guide covers the comprehensive monitoring and observability infrastructure for the AI-powered coding platform. The system provides metrics collection, distributed tracing, centralized logging, health checks, and alerting capabilities.

## Architecture

### Components

1. **Prometheus** - Metrics collection and storage
2. **Grafana** - Visualization and dashboards
3. **AlertManager** - Alert routing and management
4. **Jaeger** - Distributed tracing
5. **Loki** - Log aggregation
6. **Promtail** - Log collection agent

### Monitoring Stack

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Application   │───▶│   Prometheus    │───▶│     Grafana     │
│    Services     │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       ▼                       │
         │              ┌─────────────────┐              │
         │              │  AlertManager   │              │
         │              │                 │              │
         │              └─────────────────┘              │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     Jaeger      │    │ Notification    │    │      Loki       │
│   (Tracing)     │    │    Service      │    │   (Logging)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Quick Start

### 1. Start Monitoring Stack

```bash
# Start all monitoring services
docker-compose -f monitoring/docker-compose.yml up -d

# Run setup script
chmod +x monitoring/scripts/setup-dashboards.sh
./monitoring/scripts/setup-dashboards.sh
```

### 2. Access Dashboards

- **Grafana**: http://localhost:3000 (admin/admin)
- **Prometheus**: http://localhost:9090
- **AlertManager**: http://localhost:9093
- **Jaeger**: http://localhost:16686

### 3. Verify Setup

```bash
# Test monitoring endpoints
chmod +x monitoring/scripts/test-alerts.sh
./monitoring/scripts/test-alerts.sh
```

## Service Integration

### Adding Monitoring to a Service

1. **Install Dependencies**

```bash
npm install @ai-platform/common
```

2. **Initialize Monitoring**

```typescript
import { setupMonitoring } from './monitoring/setup';

const { metricsCollector, logger, tracingManager, healthManager } = setupMonitoring();
```

3. **Add Middleware**

```typescript
import { createMonitoringMiddleware, metricsEndpoint } from '@ai-platform/common';

const monitoringConfig = {
  serviceName: 'your-service',
  metricsCollector,
  logger,
  tracingManager,
};

app.use(createMonitoringMiddleware(monitoringConfig));
app.get('/metrics', metricsEndpoint());
app.get('/health', healthManager.healthEndpoint());
```

### Health Checks

Each service should implement health checks:

```typescript
import { DatabaseHealthCheck, RedisHealthCheck, MemoryHealthCheck } from '@ai-platform/common';

// Register health checks
healthManager.registerCheck(new DatabaseHealthCheck(checkDbConnection));
healthManager.registerCheck(new RedisHealthCheck(redisClient));
healthManager.registerCheck(new MemoryHealthCheck(85)); // 85% threshold
```

## Metrics

### Standard Metrics

All services automatically collect:

- **HTTP Metrics**: Request count, duration, status codes
- **System Metrics**: CPU, memory, disk usage
- **Database Metrics**: Connection pool, query duration
- **Queue Metrics**: Queue size, processing time

### Business Metrics

Platform-specific metrics:

- `active_users_total` - Number of active users
- `problems_solved_total` - Problems solved by difficulty/language
- `contest_participants_total` - Contest participation
- `code_executions_total` - Code execution statistics
- `ai_request_duration_seconds` - AI service response times

### Custom Metrics

Add custom metrics in your service:

```typescript
import { MetricsCollector } from '@ai-platform/common';

const metrics = new MetricsCollector('my-service');

// Record business events
metrics.recordProblemSolved('medium', 'javascript');
metrics.updateActiveUsers(150);
metrics.recordCodeExecution('python', 'success');
```

## Logging

### Structured Logging

All logs are structured with consistent fields:

```json
{
  "timestamp": "2023-01-01T00:00:00.000Z",
  "level": "info",
  "message": "User registered",
  "service": "user-service",
  "trace_id": "abc123",
  "span_id": "def456",
  "user_id": "user123",
  "correlation_id": "req-789"
}
```

### Log Levels

- **DEBUG**: Detailed debugging information
- **INFO**: General information and business events
- **WARN**: Warning conditions and security events
- **ERROR**: Error conditions and exceptions

### Usage Examples

```typescript
import { Logger } from '@ai-platform/common';

const logger = new Logger({ serviceName: 'my-service' });

// Standard logging
logger.info('User action completed', { userId: '123', action: 'login' });
logger.error('Database connection failed', error);

// Specialized logging
logger.logHttpRequest(req, res, duration);
logger.logBusinessEvent('problem_solved', { problemId: 'p123', userId: 'u456' });
logger.logSecurityEvent('suspicious_activity', { ip: '192.168.1.1' });
```

## Distributed Tracing

### Automatic Instrumentation

The tracing system automatically instruments:

- HTTP requests/responses
- Database queries
- External API calls
- Queue operations

### Manual Tracing

Add custom spans for business logic:

```typescript
import { TracingManager } from '@ai-platform/common';

const tracing = new TracingManager({ serviceName: 'my-service' });

// Trace a function
const result = await tracing.traceFunction('process-submission', async (span) => {
  span.setAttributes({ userId: '123', problemId: 'p456' });
  return await processSubmission();
});

// Add events to current span
tracing.addEvent('validation_completed', { isValid: true });
tracing.addAttributes({ complexity: 'medium' });
```

### Correlation IDs

All requests are automatically tagged with correlation IDs for end-to-end tracing:

```typescript
// Correlation ID is automatically added to logs and traces
logger.info('Processing request', { userId: '123' });
// Output includes: correlation_id: "req-abc123"
```

## Alerting

### Alert Rules

The system includes predefined alerts:

- **High Error Rate**: >5% error rate for 5 minutes
- **High Response Time**: >500ms 95th percentile for 5 minutes
- **Service Down**: Health check fails for 1 minute
- **High Resource Usage**: >80% CPU/memory for 5 minutes
- **Database Issues**: Connection pool exhaustion
- **Contest Spikes**: High submission rates during contests

### Alert Routing

Alerts are routed based on severity:

- **Critical**: Immediate notification (SMS + Slack)
- **Warning**: Slack notification
- **Info**: Monitoring channel only

### Custom Alerts

Add custom alert rules in `monitoring/prometheus/rules/alerts.yml`:

```yaml
- alert: CustomBusinessAlert
  expr: custom_metric > threshold
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "Custom business condition detected"
    description: "Custom metric {{ $value }} exceeds threshold"
```

## Dashboards

### Platform Overview Dashboard

The main dashboard shows:

- Service health status
- Request rates and response times
- Error rates by service
- Active users and business metrics
- Resource utilization

### Custom Dashboards

Create custom dashboards in Grafana:

1. Import dashboard JSON from `monitoring/grafana/dashboards/`
2. Use Prometheus as data source
3. Query metrics using PromQL

Example queries:

```promql
# Request rate by service
sum(rate(http_requests_total[5m])) by (service)

# Error rate percentage
sum(rate(http_requests_total{status=~"5.."}[5m])) by (service) / 
sum(rate(http_requests_total[5m])) by (service) * 100

# 95th percentile response time
histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, service))
```

## Performance Monitoring

### Key Performance Indicators (KPIs)

- **Availability**: 99.9% uptime target
- **Response Time**: <200ms for 95% of requests
- **Error Rate**: <1% error rate
- **Throughput**: Requests per second by service

### Performance Optimization

Monitor these metrics for optimization opportunities:

- Database query performance
- Cache hit rates
- Queue processing times
- External API response times
- Resource utilization trends

## Security Monitoring

### Security Events

The system monitors for:

- Suspicious request patterns
- Authentication failures
- Rate limiting violations
- Unusual user behavior
- Security vulnerability attempts

### Security Alerts

Security events trigger alerts and are logged for analysis:

```typescript
logger.logSecurityEvent('failed_login_attempt', {
  ip: req.ip,
  userAgent: req.headers['user-agent'],
  attemptedUsername: username
});
```

## Troubleshooting

### Common Issues

1. **Metrics Not Appearing**
   - Check service `/metrics` endpoint
   - Verify Prometheus scrape configuration
   - Check service registration in Prometheus

2. **Logs Not Showing**
   - Verify log file permissions
   - Check Promtail configuration
   - Ensure Loki is receiving logs

3. **Traces Missing**
   - Check Jaeger agent connectivity
   - Verify tracing initialization
   - Check sampling configuration

4. **Alerts Not Firing**
   - Verify AlertManager configuration
   - Check alert rule syntax
   - Test webhook endpoints

### Debug Commands

```bash
# Check Prometheus targets
curl http://localhost:9090/api/v1/targets

# Check AlertManager status
curl http://localhost:9093/api/v1/status

# Test log ingestion
curl -X POST http://localhost:3100/loki/api/v1/push \
  -H "Content-Type: application/json" \
  -d '{"streams":[{"stream":{"service":"test"},"values":[["1640995200000000000","test message"]]}]}'

# Check service health
curl http://localhost:3001/health
```

## Best Practices

### Metrics

- Use consistent naming conventions
- Add appropriate labels for filtering
- Avoid high-cardinality labels
- Set appropriate histogram buckets

### Logging

- Use structured logging consistently
- Include correlation IDs in all logs
- Log at appropriate levels
- Avoid logging sensitive information

### Tracing

- Trace business-critical operations
- Add meaningful span names and attributes
- Use sampling to control overhead
- Correlate traces with logs and metrics

### Alerting

- Set meaningful thresholds
- Avoid alert fatigue
- Include actionable information
- Test alert routing regularly

## Maintenance

### Regular Tasks

- Review and update alert thresholds
- Clean up old metrics and logs
- Update dashboard queries
- Test disaster recovery procedures
- Review security events

### Capacity Planning

Monitor trends for:

- Storage usage (metrics, logs, traces)
- Query performance
- Alert volume
- Dashboard load times

## Integration with CI/CD

### Automated Testing

Include monitoring tests in CI/CD:

```bash
# Test metrics endpoints
npm run test:monitoring

# Validate alert rules
promtool check rules monitoring/prometheus/rules/*.yml

# Test dashboard queries
grafana-cli admin validate-dashboard monitoring/grafana/dashboards/*.json
```

### Deployment Monitoring

Monitor deployments with:

- Deployment markers in Grafana
- Error rate monitoring during rollouts
- Performance regression detection
- Automated rollback triggers

This comprehensive monitoring setup ensures high availability, performance, and security for the AI coding platform while providing actionable insights for continuous improvement.