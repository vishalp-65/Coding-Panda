import { Router, Request, Response } from 'express';
import { Logger } from '@ai-platform/common';

interface AlertWebhookPayload {
    version: string;
    groupKey: string;
    status: 'firing' | 'resolved';
    receiver: string;
    groupLabels: Record<string, string>;
    commonLabels: Record<string, string>;
    commonAnnotations: Record<string, string>;
    externalURL: string;
    alerts: Alert[];
}

interface Alert {
    status: 'firing' | 'resolved';
    labels: Record<string, string>;
    annotations: Record<string, string>;
    startsAt: string;
    endsAt?: string;
    generatorURL: string;
    fingerprint: string;
}

export function createAlertsRoutes(logger: Logger): Router {
    const router = Router();

    // Webhook endpoint for AlertManager
    router.post('/webhook', async (req: Request, res: Response) => {
        try {
            const payload: AlertWebhookPayload = req.body;

            logger.info('Alert webhook received', {
                status: payload.status,
                receiver: payload.receiver,
                alertCount: payload.alerts.length,
                groupKey: payload.groupKey,
            });

            // Process each alert
            for (const alert of payload.alerts) {
                await processAlert(alert, payload.status, logger);
            }

            res.status(200).json({ status: 'ok', processed: payload.alerts.length });
        } catch (error) {
            logger.error('Error processing alert webhook', error as Error);
            res.status(500).json({ error: 'Failed to process alerts' });
        }
    });

    // Health check for alert processing
    router.get('/health', (req: Request, res: Response) => {
        res.json({
            status: 'healthy',
            service: 'alert-processor',
            timestamp: new Date().toISOString(),
        });
    });

    return router;
}

async function processAlert(alert: Alert, status: 'firing' | 'resolved', logger: Logger) {
    const alertName = alert.labels.alertname;
    const severity = alert.labels.severity || 'info';
    const instance = alert.labels.instance;
    const job = alert.labels.job;

    logger.info('Processing alert', {
        alertName,
        severity,
        status,
        instance,
        job,
        startsAt: alert.startsAt,
        endsAt: alert.endsAt,
    });

    // Route alerts based on severity and type
    switch (severity) {
        case 'critical':
            await handleCriticalAlert(alert, status, logger);
            break;
        case 'warning':
            await handleWarningAlert(alert, status, logger);
            break;
        case 'info':
            await handleInfoAlert(alert, status, logger);
            break;
        default:
            logger.warn('Unknown alert severity', { severity, alertName });
    }

    // Handle specific alert types
    switch (alertName) {
        case 'ServiceDown':
            await handleServiceDownAlert(alert, status, logger);
            break;
        case 'HighErrorRate':
            await handleHighErrorRateAlert(alert, status, logger);
            break;
        case 'HighResponseTime':
            await handleHighResponseTimeAlert(alert, status, logger);
            break;
        case 'DatabaseConnectionPoolExhaustion':
            await handleDatabaseAlert(alert, status, logger);
            break;
        case 'ContestSubmissionSpike':
            await handleContestAlert(alert, status, logger);
            break;
    }
}

async function handleCriticalAlert(alert: Alert, status: 'firing' | 'resolved', logger: Logger) {
    const message = status === 'firing'
        ? `🚨 CRITICAL ALERT: ${alert.annotations.summary}`
        : `✅ RESOLVED: ${alert.annotations.summary}`;

    logger.error('Critical alert', {
        alert: alert.labels.alertname,
        status,
        description: alert.annotations.description,
        instance: alert.labels.instance,
    });

    // Send immediate notifications to on-call team
    await sendSlackNotification({
        channel: '#alerts-critical',
        message,
        color: status === 'firing' ? 'danger' : 'good',
        fields: [
            { title: 'Alert', value: alert.labels.alertname, short: true },
            { title: 'Instance', value: alert.labels.instance, short: true },
            { title: 'Description', value: alert.annotations.description, short: false },
        ],
    });

    // Send SMS to on-call engineer for critical alerts
    if (status === 'firing') {
        await sendSMSAlert({
            message: `CRITICAL: ${alert.annotations.summary} - ${alert.labels.instance}`,
            recipients: ['on-call-engineer'],
        });
    }
}

async function handleWarningAlert(alert: Alert, status: 'firing' | 'resolved', logger: Logger) {
    const message = status === 'firing'
        ? `⚠️ WARNING: ${alert.annotations.summary}`
        : `✅ RESOLVED: ${alert.annotations.summary}`;

    logger.warn('Warning alert', {
        alert: alert.labels.alertname,
        status,
        description: alert.annotations.description,
        instance: alert.labels.instance,
    });

    await sendSlackNotification({
        channel: '#alerts-warning',
        message,
        color: status === 'firing' ? 'warning' : 'good',
        fields: [
            { title: 'Alert', value: alert.labels.alertname, short: true },
            { title: 'Instance', value: alert.labels.instance, short: true },
            { title: 'Description', value: alert.annotations.description, short: false },
        ],
    });
}

async function handleInfoAlert(alert: Alert, status: 'firing' | 'resolved', logger: Logger) {
    logger.info('Info alert', {
        alert: alert.labels.alertname,
        status,
        description: alert.annotations.description,
        instance: alert.labels.instance,
    });

    // Only send to monitoring channel for info alerts
    await sendSlackNotification({
        channel: '#monitoring',
        message: `ℹ️ ${alert.annotations.summary}`,
        color: 'good',
        fields: [
            { title: 'Alert', value: alert.labels.alertname, short: true },
            { title: 'Status', value: status, short: true },
        ],
    });
}

async function handleServiceDownAlert(alert: Alert, status: 'firing' | 'resolved', logger: Logger) {
    const serviceName = alert.labels.job;

    if (status === 'firing') {
        logger.error('Service down detected', {
            service: serviceName,
            instance: alert.labels.instance,
        });

        // Trigger auto-recovery procedures if configured
        await triggerAutoRecovery(serviceName, alert.labels.instance, logger);
    } else {
        logger.info('Service recovered', {
            service: serviceName,
            instance: alert.labels.instance,
        });
    }
}

async function handleHighErrorRateAlert(alert: Alert, status: 'firing' | 'resolved', logger: Logger) {
    const serviceName = alert.labels.job;

    if (status === 'firing') {
        logger.warn('High error rate detected', {
            service: serviceName,
            instance: alert.labels.instance,
        });

        // Could trigger circuit breaker or traffic reduction
        await handleHighErrorRate(serviceName, logger);
    }
}

async function handleHighResponseTimeAlert(alert: Alert, status: 'firing' | 'resolved', logger: Logger) {
    const serviceName = alert.labels.job;

    if (status === 'firing') {
        logger.warn('High response time detected', {
            service: serviceName,
            instance: alert.labels.instance,
        });

        // Could trigger auto-scaling
        await handleHighResponseTime(serviceName, logger);
    }
}

async function handleDatabaseAlert(alert: Alert, status: 'firing' | 'resolved', logger: Logger) {
    if (status === 'firing') {
        logger.error('Database connection pool exhaustion', {
            instance: alert.labels.instance,
        });

        // Could trigger connection pool scaling or database failover
        await handleDatabaseIssue(logger);
    }
}

async function handleContestAlert(alert: Alert, status: 'firing' | 'resolved', logger: Logger) {
    if (status === 'firing') {
        logger.info('Contest submission spike detected', {
            instance: alert.labels.instance,
        });

        // Scale up code execution services
        await scaleCodeExecutionServices(logger);
    }
}

// Mock implementations for notification services
async function sendSlackNotification(notification: {
    channel: string;
    message: string;
    color: string;
    fields: Array<{ title: string; value: string; short: boolean }>;
}) {
    // In a real implementation, this would send to Slack API
    console.log('Slack notification:', notification);
}

async function sendSMSAlert(alert: {
    message: string;
    recipients: string[];
}) {
    // In a real implementation, this would send SMS via Twilio or similar
    console.log('SMS alert:', alert);
}

async function triggerAutoRecovery(serviceName: string, instance: string, logger: Logger) {
    logger.info('Triggering auto-recovery', { serviceName, instance });
    // Could restart containers, switch to backup instances, etc.
}

async function handleHighErrorRate(serviceName: string, logger: Logger) {
    logger.info('Handling high error rate', { serviceName });
    // Could enable circuit breaker, reduce traffic, etc.
}

async function handleHighResponseTime(serviceName: string, logger: Logger) {
    logger.info('Handling high response time', { serviceName });
    // Could trigger auto-scaling, load balancing changes, etc.
}

async function handleDatabaseIssue(logger: Logger) {
    logger.info('Handling database issue');
    // Could scale connection pools, trigger failover, etc.
}

async function scaleCodeExecutionServices(logger: Logger) {
    logger.info('Scaling code execution services');
    // Could trigger Kubernetes HPA or manual scaling
}