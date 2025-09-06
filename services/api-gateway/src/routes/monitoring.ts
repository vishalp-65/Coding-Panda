import { Router } from 'express';
import { metricsEndpoint } from '@ai-platform/common';
import { HealthManager } from '@ai-platform/common';

export function createMonitoringRoutes(healthManager: HealthManager): Router {
    const router = Router();

    // Prometheus metrics endpoint
    router.get('/metrics', metricsEndpoint());

    // Health check endpoint
    router.get('/health', healthManager.healthEndpoint());

    // Liveness probe (Kubernetes)
    router.get('/health/live', healthManager.livenessProbe());

    // Readiness probe (Kubernetes)
    router.get('/health/ready', healthManager.readinessProbe());

    // Service info endpoint
    router.get('/info', (req, res) => {
        res.json({
            service: 'api-gateway',
            version: process.env.SERVICE_VERSION || '1.0.0',
            environment: process.env.NODE_ENV || 'development',
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
            node_version: process.version,
            memory: process.memoryUsage(),
        });
    });

    return router;
}