import { MetricsCollector, metricsRegistry } from '../monitoring/metrics';
import { Logger } from '../monitoring/logging';
import { HealthManager, DatabaseHealthCheck, RedisHealthCheck } from '../monitoring/health';
import { TracingManager } from '../monitoring/tracing';

describe('Monitoring Infrastructure', () => {
    describe('MetricsCollector', () => {
        let metricsCollector: MetricsCollector;

        beforeEach(() => {
            metricsCollector = new MetricsCollector('test-service');
        });

        it('should record HTTP requests', async () => {
            metricsCollector.recordHttpRequest('GET', '/api/test', 200, 0.1);

            const metrics = await metricsRegistry.metrics();
            expect(metrics).toContain('http_requests_total');
        });

        it('should record database queries', async () => {
            metricsCollector.recordDatabaseQuery('SELECT', 'users', 0.05);

            const metrics = await metricsRegistry.metrics();
            expect(metrics).toContain('database_query_duration_seconds');
        });

        it('should update active users count', async () => {
            metricsCollector.updateActiveUsers(150);

            const metrics = await metricsRegistry.metrics();
            expect(metrics).toContain('active_users_total');
        });

        it('should record problem solved events', async () => {
            metricsCollector.recordProblemSolved('medium', 'javascript');

            const metrics = await metricsRegistry.metrics();
            expect(metrics).toContain('problems_solved_total');
        });

        it('should record code execution metrics', async () => {
            metricsCollector.recordCodeExecution('python', 'success');
            metricsCollector.recordCodeExecutionTimeout('python');

            const metrics = await metricsRegistry.metrics();
            expect(metrics).toContain('code_executions_total');
            expect(metrics).toContain('code_execution_timeouts_total');
        });
    });

    describe('Logger', () => {
        let logger: Logger;

        beforeEach(() => {
            logger = new Logger({
                serviceName: 'test-service',
                level: 'debug',
            });
        });

        it('should log messages with service name', () => {
            // Test that logger can be created and used
            expect(logger).toBeDefined();
            expect(() => logger.info('Test message')).not.toThrow();
        });

        it('should log HTTP requests with structured data', () => {
            const mockReq = {
                method: 'GET',
                url: '/api/test',
                headers: { 'user-agent': 'test-agent' },
                ip: '127.0.0.1',
                correlationId: 'test-correlation-id',
            };
            const mockRes = { statusCode: 200 };

            const infoSpy = jest.spyOn(logger, 'info');
            logger.logHttpRequest(mockReq, mockRes, 100);

            expect(infoSpy).toHaveBeenCalledWith('HTTP Request', expect.objectContaining({
                method: 'GET',
                url: '/api/test',
                status: 200,
                duration: 100,
            }));
        });

        it('should log business events', () => {
            const infoSpy = jest.spyOn(logger, 'info');

            logger.logBusinessEvent('user_registered', { userId: '123' });

            expect(infoSpy).toHaveBeenCalledWith('Business Event', expect.objectContaining({
                event: 'user_registered',
                userId: '123',
            }));
        });

        it('should log security events', () => {
            const warnSpy = jest.spyOn(logger, 'warn');

            logger.logSecurityEvent('suspicious_activity', { ip: '192.168.1.1' });

            expect(warnSpy).toHaveBeenCalledWith('Security Event', expect.objectContaining({
                event: 'suspicious_activity',
                ip: '192.168.1.1',
            }));
        });
    });

    describe('HealthManager', () => {
        let healthManager: HealthManager;

        beforeEach(() => {
            healthManager = new HealthManager('test-service', '1.0.0');
        });

        it('should return healthy status with no checks', async () => {
            const health = await healthManager.runHealthChecks();

            expect(health.status).toBe('healthy');
            expect(health.service).toBe('test-service');
            expect(health.version).toBe('1.0.0');
            expect(health.checks).toEqual({});
        });

        it('should register and run health checks', async () => {
            const mockCheck = {
                name: 'test-check',
                check: jest.fn().mockResolvedValue({
                    status: 'healthy',
                    message: 'Test check passed',
                }),
            };

            healthManager.registerCheck(mockCheck);
            const health = await healthManager.runHealthChecks();

            expect(health.status).toBe('healthy');
            expect(health.checks['test-check']).toEqual(expect.objectContaining({
                status: 'healthy',
                message: 'Test check passed',
                responseTime: expect.any(Number),
            }));
        });

        it('should return unhealthy status when check fails', async () => {
            const mockCheck = {
                name: 'failing-check',
                check: jest.fn().mockResolvedValue({
                    status: 'unhealthy',
                    message: 'Test check failed',
                }),
            };

            healthManager.registerCheck(mockCheck);
            const health = await healthManager.runHealthChecks();

            expect(health.status).toBe('unhealthy');
            expect(health.checks['failing-check'].status).toBe('unhealthy');
        });

        it('should handle check exceptions', async () => {
            const mockCheck = {
                name: 'exception-check',
                check: jest.fn().mockRejectedValue(new Error('Check threw error')),
            };

            healthManager.registerCheck(mockCheck);
            const health = await healthManager.runHealthChecks();

            expect(health.status).toBe('unhealthy');
            expect(health.checks['exception-check']).toEqual(expect.objectContaining({
                status: 'unhealthy',
                message: 'Check threw error',
            }));
        });
    });

    describe('DatabaseHealthCheck', () => {
        it('should return healthy when connection succeeds', async () => {
            const mockConnection = jest.fn().mockResolvedValue(true);
            const healthCheck = new DatabaseHealthCheck(mockConnection);

            const result = await healthCheck.check();

            expect(result.status).toBe('healthy');
            expect(result.message).toContain('healthy');
        });

        it('should return unhealthy when connection fails', async () => {
            const mockConnection = jest.fn().mockResolvedValue(false);
            const healthCheck = new DatabaseHealthCheck(mockConnection);

            const result = await healthCheck.check();

            expect(result.status).toBe('unhealthy');
            expect(result.message).toContain('failed');
        });

        it('should handle connection exceptions', async () => {
            const mockConnection = jest.fn().mockRejectedValue(new Error('Connection error'));
            const healthCheck = new DatabaseHealthCheck(mockConnection);

            const result = await healthCheck.check();

            expect(result.status).toBe('unhealthy');
            expect(result.message).toContain('Connection error');
        });
    });

    describe('RedisHealthCheck', () => {
        it('should return healthy when Redis ping succeeds', async () => {
            const mockRedisClient = {
                ping: jest.fn().mockResolvedValue('PONG'),
            };
            const healthCheck = new RedisHealthCheck(mockRedisClient);

            const result = await healthCheck.check();

            expect(result.status).toBe('healthy');
            expect(mockRedisClient.ping).toHaveBeenCalled();
        });

        it('should return unhealthy when Redis ping fails', async () => {
            const mockRedisClient = {
                ping: jest.fn().mockRejectedValue(new Error('Redis connection failed')),
            };
            const healthCheck = new RedisHealthCheck(mockRedisClient);

            const result = await healthCheck.check();

            expect(result.status).toBe('unhealthy');
            expect(result.message).toContain('Redis connection failed');
        });
    });

    describe('TracingManager', () => {
        let tracingManager: TracingManager;

        beforeEach(() => {
            tracingManager = new TracingManager({
                serviceName: 'test-service',
                serviceVersion: '1.0.0',
            });
        });

        it('should generate correlation IDs', () => {
            const correlationId = tracingManager.generateCorrelationId();

            expect(correlationId).toBeDefined();
            expect(typeof correlationId).toBe('string');
            expect(correlationId.length).toBeGreaterThan(0);
        });

        it('should trace function execution', async () => {
            const mockFunction = jest.fn().mockResolvedValue('test result');

            const result = await tracingManager.traceFunction('test-operation', mockFunction);

            expect(result).toBe('test result');
            expect(mockFunction).toHaveBeenCalled();
        });

        it('should handle function exceptions in tracing', async () => {
            const mockFunction = jest.fn().mockRejectedValue(new Error('Test error'));

            await expect(
                tracingManager.traceFunction('test-operation', mockFunction)
            ).rejects.toThrow('Test error');
        });
    });
});

describe('Monitoring Integration', () => {
    it('should work together for comprehensive monitoring', async () => {
        const metricsCollector = new MetricsCollector('integration-test');
        const logger = new Logger({ serviceName: 'integration-test' });
        const healthManager = new HealthManager('integration-test');

        // Add a health check
        healthManager.registerCheck({
            name: 'integration-check',
            check: async () => ({ status: 'healthy', message: 'All good' }),
        });

        // Record some metrics
        metricsCollector.recordHttpRequest('GET', '/test', 200, 0.1);
        metricsCollector.updateActiveUsers(10);

        // Log some events
        logger.info('Integration test started');
        logger.logBusinessEvent('test_event', { data: 'test' });

        // Check health
        const health = await healthManager.runHealthChecks();

        expect(health.status).toBe('healthy');
        expect(health.checks['integration-check'].status).toBe('healthy');
    });

    it('should record security metrics', async () => {
        const metricsCollector = new MetricsCollector('security-test');

        metricsCollector.recordAuthFailure('invalid_password');
        metricsCollector.recordSecurityEvent('suspicious_activity', 'warning');
        metricsCollector.recordRateLimitHit('/api/test');

        const metrics = await metricsRegistry.metrics();
        expect(metrics).toContain('auth_failures_total');
        expect(metrics).toContain('security_events_total');
        expect(metrics).toContain('rate_limit_hits_total');
    });

    it('should record business metrics', async () => {
        const metricsCollector = new MetricsCollector('business-test');

        metricsCollector.recordContestSubmission('contest-123', 'python');
        metricsCollector.updateActiveSessions(25);
        metricsCollector.recordCacheHit('redis');
        metricsCollector.recordCacheMiss('redis');

        const metrics = await metricsRegistry.metrics();
        expect(metrics).toContain('contest_submissions_total');
        expect(metrics).toContain('user_sessions_active');
        expect(metrics).toContain('cache_hits_total');
        expect(metrics).toContain('cache_misses_total');
    });

    it('should update system metrics', async () => {
        const metricsCollector = new MetricsCollector('system-test');

        metricsCollector.updateSystemMetrics();

        const metrics = await metricsRegistry.metrics();
        expect(metrics).toContain('memory_usage_bytes');
        expect(metrics).toContain('cpu_usage_percent');
    });
});

describe('System Monitor', () => {
    let systemMonitor: any;
    let metricsCollector: MetricsCollector;
    let logger: Logger;

    beforeEach(() => {
        metricsCollector = new MetricsCollector('system-monitor-test');
        logger = new Logger({ serviceName: 'system-monitor-test' });

        // Import SystemMonitor dynamically to avoid issues with require in tests
        const { SystemMonitor } = require('../monitoring/system');
        systemMonitor = new SystemMonitor(metricsCollector, logger);
    });

    afterEach(() => {
        if (systemMonitor) {
            systemMonitor.stopCollection();
        }
    });

    it('should collect system metrics', () => {
        const metrics = systemMonitor.collectMetrics();

        expect(metrics).toHaveProperty('memory');
        expect(metrics).toHaveProperty('cpu');
        expect(metrics).toHaveProperty('uptime');
        expect(metrics.memory).toHaveProperty('heapUsed');
        expect(metrics.memory).toHaveProperty('heapTotal');
        expect(metrics.cpu).toHaveProperty('user');
        expect(metrics.cpu).toHaveProperty('system');
    });

    it('should get health status', () => {
        const health = systemMonitor.getHealthStatus();

        expect(health).toHaveProperty('status');
        expect(health).toHaveProperty('details');
        expect(['healthy', 'degraded', 'unhealthy']).toContain(health.status);
    });

    it('should start and stop collection', () => {
        expect(() => systemMonitor.startCollection(1000)).not.toThrow();
        expect(() => systemMonitor.stopCollection()).not.toThrow();
    });
});