# AI Coding Platform - Monitoring and Observability

## Overview

This directory contains the comprehensive monitoring and observability infrastructure for the AI-powered coding platform. The system provides metrics collection, distributed tracing, centralized logging, health checks, and alerting capabilities.

## Quick Start

### 1. Start Monitoring Stack

```bash
# Start all monitoring services
docker-compose -f monitoring/docker-compose.yml up -d

# Run setup script to configure dashboards
chmod +x monitoring/scripts/setup-dashboards.sh
./monitoring/scripts/setup-dashboards.sh
```

### 2. Access Dashboards

- **Grafana**: http://localhost:3000 (admin/admin)
- **Prometheus**: http://localhost:9090
- **AlertManager**: http://localhost:9093
- **Jaeger**: http://localhost:16686
- **Loki**: http://localhost:3100

### 3. Verify Setup

```bash
# Test monitoring endpoints and alerts
chmod +x monitoring/scripts/test-alerts.sh
./monitoring/scripts/test-alerts.sh
```

## Architecture

### Components

1. **Prometheus** - Metrics collection and storage
2. **Grafana** - Visualization and dashboards
3. **AlertManager** - Alert routing and management
4. **Jaeger** - Distributed tracing
5. **Loki** - Log aggregation
6. **Promtail** - Log collection agent
7. **Node Exporter** - System metrics collection

### Monitoring Stack Flow

```
Application Services → Prometheus → Grafana
                   ↓
                AlertManager → Notifications
                   ↓
              Jaeger (Tracing)
                   ↓
              Loki (Logging)
```

## Service Integration

### Basic Setup

```typescript
import { setupMonitoring, createMonitoringMiddleware, metricsEndpoint } from '@ai-platform/common';

// Initialize monitoring
const monitoring = setupMonitoring({
    serviceName: 'my-service',
    serviceVersion: '1.0.0',
    environment: 'production',
});

const { metricsCollector, logger, tracingManager, healthManager } = monitoring;

// Add to Express app
app.use(createMonitoringMiddleware({
    serviceName: 'my-service',
    metricsCollector,
    logger,
    tracingManager,
}));

// Add endpoints
app.get('/health', healthManager.healthEndpoint());
app.get('/metrics', metricsEndpoint());
```

### Health Checks

```typescript
import { DatabaseHealthCheck, RedisHealthCheck } from '@ai-platform/common';

// Register health checks
healthManager.registerCheck(new DatabaseHealthCheck(checkDbConnection));
healthManager.registerCheck(new RedisHealthCheck(redisClient));
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

### Security Metrics

- `auth_failures_total` - Authentication failures
- `security_events_total` - Security events by type
- `rate_limit_hits_total` - Rate limiting violations

### Custom Metrics

```typescript
// Record business events
metricsCollector.recordProblemSolved('medium', 'javascript');
metricsCollector.updateActiveUsers(150);
metricsCollector.recordCodeExecution('python', 'success');

// Record security events
metricsCollector.recordAuthFailure('invalid_password');
metricsCollector.recordSecurityEvent('suspicious_activity', 'warning');
```

## Logging

### Structured Logging

All logs include:

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

### Usage Examples

```typescript
// Standard logging
logger.info('User action completed', { userId: '123', action: 'login' });
logger.error('Database connection failed', error);

// Specialized logging
logger.logHttpRequest(req, res, duration);
logger.logBusinessEvent('problem_solved', { problemId: 'p123' });
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

```typescript
// Trace a function
const result = await tracingManager.traceFunction('process-submission', async (span) => {
    span.setAttributes({ userId: '123', problemId: 'p456' });
    return await processSubmission();
});

// Add events to current span
tracingManager.addEvent('validation_completed', { isValid: true });
```

## Alerting

### Alert Rules

The system includes predefined alerts:

- **High Error Rate**: >5% error rate for 5 minutes
- **High Response Time**: >500ms 95th percentile for 5 minutes
- **Service Down**: Health check fails for 1 minute
- **High Resource Usage**: >80% CPU/memory for 5 minutes
- **Security Events**: Authentication failures, suspicious activity

### Alert Routing

- **Critical**: Immediate notification (Email + Webhook)
- **Warning**: Email notification
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
```

## Dashboards

### Available Dashboards

1. **Platform Overview** - Service health, request rates, response times
2. **Performance Monitoring** - Detailed performance metrics
3. **Business Metrics** - KPIs and business events
4. **Security Monitoring** - Security events and threats

### Key Performance Indicators (KPIs)

- **Availability**: 99.9% uptime target
- **Response Time**: <200ms for 95% of requests
- **Error Rate**: <1% error rate
- **Throughput**: Requests per second by service

## Security Monitoring

### Security Events

The system monitors for:

- Suspicious request patterns (XSS, SQL injection, path traversal)
- Authentication failures
- Rate limiting violations
- Unusual user behavior
- Large request payloads

### Security Metrics

```typescript
// Record security events
metricsCollector.recordAuthFailure('invalid_credentials');
metricsCollector.recordSecurityEvent('xss_attempt', 'critical');
metricsCollector.recordRateLimitHit('/api/sensitive');
```

## System Monitoring

### System Metrics Collection

```typescript
import { createSystemMonitor } from '@ai-platform/common';

// Create system monitor
const systemMonitor = createSystemMonitor(metricsCollector, logger, true, 30000);

// Get health status
const health = systemMonitor.getHealthStatus();
```

### Monitored System Metrics

- Memory usage (heap, RSS, external)
- CPU usage percentage
- System uptime
- Load average (Unix systems)

## Troubleshooting

### Common Issues

1. **Metrics Not Appearing**
   - Check service `/metrics` endpoint
   - Verify Prometheus scrape configuration
   - Check service registration

2. **Logs Not Showing**
   - Verify log file permissions
   - Check Promtail configuration
   - Ensure Loki connectivity

3. **Traces Missing**
   - Check Jaeger agent connectivity
   - Verify tracing initialization
   - Check sampling configuration

### Debug Commands

```bash
# Check Prometheus targets
curl http://localhost:9090/api/v1/targets

# Check AlertManager status
curl http://localhost:9093/api/v1/status

# Test service health
curl http://localhost:3001/health

# Check service metrics
curl http://localhost:3001/metrics
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

## Development

### Running Tests

```bash
cd packages/common
npm test
```

### Building

```bash
cd packages/common
npm run build
```

### Adding New Metrics

1. Define metric in `packages/common/src/monitoring/metrics.ts`
2. Add collection method to `MetricsCollector` class
3. Update tests in `packages/common/src/__tests__/monitoring.test.ts`
4. Add to relevant dashboards

### Adding New Health Checks

1. Create health check class implementing `HealthCheck` interface
2. Register in service setup
3. Add tests for the health check

This comprehensive monitoring setup ensures high availability, performance, and security for the AI coding platform while providing actionable insights for continuous improvement.