import { register, collectDefaultMetrics, Counter, Histogram, Gauge } from 'prom-client';

// Collect default metrics (CPU, memory, etc.)
collectDefaultMetrics({ register });

// HTTP request metrics
export const httpRequestsTotal = new Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status', 'service'],
    registers: [register]
});

export const httpRequestDuration = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status', 'service'],
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5, 10],
    registers: [register]
});

// Database metrics
export const databaseConnectionsActive = new Gauge({
    name: 'database_connections_active',
    help: 'Number of active database connections',
    labelNames: ['database', 'service'],
    registers: [register]
});

export const databaseConnectionsMax = new Gauge({
    name: 'database_connections_max',
    help: 'Maximum number of database connections',
    labelNames: ['database', 'service'],
    registers: [register]
});

export const databaseQueryDuration = new Histogram({
    name: 'database_query_duration_seconds',
    help: 'Duration of database queries in seconds',
    labelNames: ['operation', 'table', 'service'],
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
    registers: [register]
});

// Queue metrics
export const queueSize = new Gauge({
    name: 'queue_size',
    help: 'Number of items in queue',
    labelNames: ['queue_name', 'service'],
    registers: [register]
});

export const queueProcessingDuration = new Histogram({
    name: 'queue_processing_duration_seconds',
    help: 'Duration of queue item processing in seconds',
    labelNames: ['queue_name', 'service'],
    buckets: [0.1, 0.5, 1, 5, 10, 30, 60],
    registers: [register]
});

// Business metrics
export const activeUsersTotal = new Gauge({
    name: 'active_users_total',
    help: 'Total number of active users',
    labelNames: ['service'],
    registers: [register]
});

export const problemsSolvedTotal = new Counter({
    name: 'problems_solved_total',
    help: 'Total number of problems solved',
    labelNames: ['difficulty', 'language', 'service'],
    registers: [register]
});

export const contestParticipantsTotal = new Gauge({
    name: 'contest_participants_total',
    help: 'Total number of contest participants',
    labelNames: ['contest_id', 'service'],
    registers: [register]
});

export const codeExecutionsTotal = new Counter({
    name: 'code_executions_total',
    help: 'Total number of code executions',
    labelNames: ['language', 'status', 'service'],
    registers: [register]
});

export const codeExecutionTimeouts = new Counter({
    name: 'code_execution_timeouts_total',
    help: 'Total number of code execution timeouts',
    labelNames: ['language', 'service'],
    registers: [register]
});

export const aiRequestDuration = new Histogram({
    name: 'ai_request_duration_seconds',
    help: 'Duration of AI service requests in seconds',
    labelNames: ['operation', 'service'],
    buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
    registers: [register]
});

// Security metrics
export const authFailuresTotal = new Counter({
    name: 'auth_failures_total',
    help: 'Total number of authentication failures',
    labelNames: ['reason', 'service'],
    registers: [register]
});

export const securityEventsTotal = new Counter({
    name: 'security_events_total',
    help: 'Total number of security events',
    labelNames: ['event_type', 'severity', 'service'],
    registers: [register]
});

export const rateLimitHitsTotal = new Counter({
    name: 'rate_limit_hits_total',
    help: 'Total number of rate limit hits',
    labelNames: ['endpoint', 'service'],
    registers: [register]
});

// Additional business metrics
export const contestSubmissionsTotal = new Counter({
    name: 'contest_submissions_total',
    help: 'Total number of contest submissions',
    labelNames: ['contest_id', 'language', 'service'],
    registers: [register]
});

export const userSessionsActive = new Gauge({
    name: 'user_sessions_active',
    help: 'Number of active user sessions',
    labelNames: ['service'],
    registers: [register]
});

export const cacheHitsTotal = new Counter({
    name: 'cache_hits_total',
    help: 'Total number of cache hits',
    labelNames: ['cache_type', 'service'],
    registers: [register]
});

export const cacheMissesTotal = new Counter({
    name: 'cache_misses_total',
    help: 'Total number of cache misses',
    labelNames: ['cache_type', 'service'],
    registers: [register]
});

// Performance metrics
export const memoryUsageBytes = new Gauge({
    name: 'memory_usage_bytes',
    help: 'Memory usage in bytes',
    labelNames: ['type', 'service'],
    registers: [register]
});

export const cpuUsagePercent = new Gauge({
    name: 'cpu_usage_percent',
    help: 'CPU usage percentage',
    labelNames: ['service'],
    registers: [register]
});

// Custom metrics helper
export class MetricsCollector {
    private serviceName: string;

    constructor(serviceName: string) {
        this.serviceName = serviceName;
    }

    recordHttpRequest(method: string, route: string, status: number, duration: number) {
        httpRequestsTotal.inc({
            method,
            route,
            status: status.toString(),
            service: this.serviceName
        });

        httpRequestDuration.observe({
            method,
            route,
            status: status.toString(),
            service: this.serviceName
        }, duration);
    }

    recordDatabaseQuery(operation: string, table: string, duration: number) {
        databaseQueryDuration.observe({
            operation,
            table,
            service: this.serviceName
        }, duration);
    }

    updateActiveConnections(database: string, active: number, max: number) {
        databaseConnectionsActive.set({ database, service: this.serviceName }, active);
        databaseConnectionsMax.set({ database, service: this.serviceName }, max);
    }

    updateQueueSize(queueName: string, size: number) {
        queueSize.set({ queue_name: queueName, service: this.serviceName }, size);
    }

    recordQueueProcessing(queueName: string, duration: number) {
        queueProcessingDuration.observe({
            queue_name: queueName,
            service: this.serviceName
        }, duration);
    }

    updateActiveUsers(count: number) {
        activeUsersTotal.set({ service: this.serviceName }, count);
    }

    recordProblemSolved(difficulty: string, language: string) {
        problemsSolvedTotal.inc({
            difficulty,
            language,
            service: this.serviceName
        });
    }

    updateContestParticipants(contestId: string, count: number) {
        contestParticipantsTotal.set({
            contest_id: contestId,
            service: this.serviceName
        }, count);
    }

    recordCodeExecution(language: string, status: string) {
        codeExecutionsTotal.inc({
            language,
            status,
            service: this.serviceName
        });
    }

    recordCodeExecutionTimeout(language: string) {
        codeExecutionTimeouts.inc({
            language,
            service: this.serviceName
        });
    }

    recordAIRequest(operation: string, duration: number) {
        aiRequestDuration.observe({
            operation,
            service: this.serviceName
        }, duration);
    }

    // Security metrics methods
    recordAuthFailure(reason: string) {
        authFailuresTotal.inc({
            reason,
            service: this.serviceName
        });
    }

    recordSecurityEvent(eventType: string, severity: string) {
        securityEventsTotal.inc({
            event_type: eventType,
            severity,
            service: this.serviceName
        });
    }

    recordRateLimitHit(endpoint: string) {
        rateLimitHitsTotal.inc({
            endpoint,
            service: this.serviceName
        });
    }

    // Additional business metrics methods
    recordContestSubmission(contestId: string, language: string) {
        contestSubmissionsTotal.inc({
            contest_id: contestId,
            language,
            service: this.serviceName
        });
    }

    updateActiveSessions(count: number) {
        userSessionsActive.set({ service: this.serviceName }, count);
    }

    recordCacheHit(cacheType: string) {
        cacheHitsTotal.inc({
            cache_type: cacheType,
            service: this.serviceName
        });
    }

    recordCacheMiss(cacheType: string) {
        cacheMissesTotal.inc({
            cache_type: cacheType,
            service: this.serviceName
        });
    }

    // Performance metrics methods
    updateMemoryUsage(type: string, bytes: number) {
        memoryUsageBytes.set({
            type,
            service: this.serviceName
        }, bytes);
    }

    updateCpuUsage(percent: number) {
        cpuUsagePercent.set({ service: this.serviceName }, percent);
    }

    // Convenience method to update system metrics
    updateSystemMetrics() {
        const memUsage = process.memoryUsage();
        this.updateMemoryUsage('heap_used', memUsage.heapUsed);
        this.updateMemoryUsage('heap_total', memUsage.heapTotal);
        this.updateMemoryUsage('external', memUsage.external);
        this.updateMemoryUsage('rss', memUsage.rss);

        // CPU usage would require additional libraries in production
        // For now, we'll use a placeholder
        const cpuUsage = process.cpuUsage();
        const cpuPercent = (cpuUsage.user + cpuUsage.system) / 1000000; // Convert to seconds
        this.updateCpuUsage(cpuPercent);
    }
}

export { register as metricsRegistry };