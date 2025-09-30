/**
 * Example of how to integrate comprehensive monitoring into a service
 */

import express from 'express';
import { setupMonitoring, shutdownMonitoring } from './setup';
import { createMonitoringMiddleware, metricsEndpoint } from './middleware';
import { DatabaseHealthCheck, RedisHealthCheck, ExternalServiceHealthCheck } from './health';
import { createSystemMonitor } from './system';

// Example service setup with comprehensive monitoring
export function createMonitoredService(serviceName: string) {
    const app = express();

    // Setup monitoring components
    const monitoring = setupMonitoring({
        serviceName,
        serviceVersion: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        enableTracing: true,
        enableMetrics: true,
        enableHealthChecks: true,
    });

    const { metricsCollector, logger, tracingManager, healthManager } = monitoring;

    // Setup system monitoring
    const systemMonitor = createSystemMonitor(metricsCollector, logger, true, 30000);

    // Register health checks
    healthManager.registerCheck(new DatabaseHealthCheck(async () => {
        // Replace with actual database connection check
        return true;
    }));

    // Example Redis health check (if using Redis)
    // healthManager.registerCheck(new RedisHealthCheck(redisClient));

    // Example external service health check
    healthManager.registerCheck(new ExternalServiceHealthCheck(
        'ai-service',
        'http://localhost:8001/health',
        5000
    ));

    // Add monitoring middleware
    app.use(createMonitoringMiddleware({
        serviceName,
        metricsCollector,
        logger,
        tracingManager,
    }));

    // Add health and metrics endpoints
    app.get('/health', healthManager.healthEndpoint());
    app.get('/health/live', healthManager.livenessProbe());
    app.get('/health/ready', healthManager.readinessProbe());
    app.get('/metrics', metricsEndpoint());

    // Example business logic with monitoring
    app.post('/api/problems/:id/solve', async (req, res) => {
        const problemId = req.params.id;
        const { code, language } = req.body;

        try {
            // Record business metrics
            metricsCollector.recordProblemSolved('medium', language);

            // Log business event
            logger.logBusinessEvent('problem_solve_attempt', {
                problemId,
                language,
                userId: (req as any).user?.id,
            });

            // Simulate processing with tracing
            if (tracingManager) {
                await tracingManager.traceFunction('solve-problem', async (span) => {
                    span.setAttributes({
                        'problem.id': problemId,
                        'code.language': language,
                        'user.id': (req as any).user?.id || 'anonymous',
                    });

                    // Simulate code execution
                    await new Promise(resolve => setTimeout(resolve, 100));

                    span.addEvent('code_executed', { success: true });
                });
            }

            // Record successful execution
            metricsCollector.recordCodeExecution(language, 'success');

            res.json({ success: true, message: 'Problem solved!' });
        } catch (error) {
            logger.error('Error solving problem', error as Error, {
                problemId,
                language,
                userId: (req as any).user?.id,
            });

            metricsCollector.recordCodeExecution(language, 'error');

            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    });

    // Example authentication endpoint with security monitoring
    app.post('/api/auth/login', async (req, res) => {
        const { email, password } = req.body;

        try {
            // Simulate authentication
            const isValid = await validateCredentials(email, password);

            if (isValid) {
                logger.logBusinessEvent('user_login', { email });
                res.json({ success: true, token: 'jwt-token' });
            } else {
                // Record authentication failure
                metricsCollector.recordAuthFailure('invalid_credentials');
                logger.logSecurityEvent('login_failed', { email, ip: req.ip });
                res.status(401).json({ success: false, error: 'Invalid credentials' });
            }
        } catch (error) {
            logger.error('Authentication error', error as Error, { email });
            metricsCollector.recordAuthFailure('system_error');
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    });

    // Graceful shutdown
    const shutdown = async () => {
        logger.info('Shutting down service');

        systemMonitor.stopCollection();
        await shutdownMonitoring(monitoring);

        process.exit(0);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

    return {
        app,
        monitoring,
        systemMonitor,
        shutdown,
    };
}

// Mock function for example
async function validateCredentials(email: string, password: string): Promise<boolean> {
    // Simulate async validation
    await new Promise(resolve => setTimeout(resolve, 50));
    return email === 'test@example.com' && password === 'password';
}

// Example usage
if (require.main === module) {
    const { app } = createMonitoredService('example-service');

    const port = process.env.PORT || 3000;
    app.listen(port, () => {
        console.log(`Service running on port ${port}`);
        console.log(`Health check: http://localhost:${port}/health`);
        console.log(`Metrics: http://localhost:${port}/metrics`);
    });
}