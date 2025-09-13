import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import cron from 'cron';
import { RedisManager } from './config/redis';
import { EmailConfig } from './config/email';
import { QueueService } from './services/QueueService';
import { NotificationService } from './services/NotificationService';
import { AnalyticsService } from './services/AnalyticsService';
import { errorHandler } from '@ai-platform/common';
import { logger } from '@ai-platform/common';
import notificationRoutes from './routes/notifications';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3005;

// Constants
const CLEANUP_CRON = '0 2 * * *'; // Daily at 2 AM
const DIGEST_CRON = '0 9 * * *';  // Daily at 9 AM

// Middleware
app.use(helmet());
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.path}`, {
        method: req.method,
        path: req.path,
        userAgent: req.get('User-Agent'),
        ip: req.ip
    });
    next();
});

// Routes
app.use('/api/notifications', notificationRoutes);

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        service: 'AI Platform Notification Service',
        version: '1.0.0',
        status: 'running',
        timestamp: new Date().toISOString()
    });
});

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: {
            code: 'NOT_FOUND',
            message: `Route ${req.method} ${req.originalUrl} not found`,
            timestamp: new Date().toISOString()
        }
    });
});

// Initialize services
async function initializeServices(): Promise<void> {
    try {
        logger.info('Initializing Notification Service...');

        // Initialize Redis connection
        const redis = RedisManager.getInstance();
        await redis.connect();
        logger.info('Redis connected successfully');

        // Verify email configuration
        const emailConfig = EmailConfig.getInstance();
        const emailVerified = await emailConfig.verifyConnection();
        if (emailVerified) {
            logger.info('Email configuration verified');
        } else {
            logger.warn('Email configuration could not be verified');
        }

        // Initialize queue service
        const queueService = QueueService.getInstance();
        await queueService.initialize();
        logger.info('Queue service initialized');

        // Initialize other services
        const notificationService = NotificationService.getInstance();
        const analyticsService = AnalyticsService.getInstance();
        logger.info('Core services initialized');

        // Set up cron jobs
        setupCronJobs();
        logger.info('Cron jobs scheduled');

        logger.info('Notification Service fully initialized');
    } catch (error) {
        logger.error('Failed to initialize services:', error);
        process.exit(1);
    }
}

function setupCronJobs(): void {
    // Clean up expired notifications daily at 2 AM
    const cleanupJob = new cron.CronJob(CLEANUP_CRON, async () => {
        try {
            logger.info('Running notification cleanup...');
            const notificationService = NotificationService.getInstance();
            const analyticsService = AnalyticsService.getInstance();

            const [notificationsCleaned, analyticsCleaned] = await Promise.all([
                notificationService.cleanupExpiredNotifications(),
                analyticsService.cleanupOldAnalytics()
            ]);

            logger.info('Cleanup completed', {
                notificationsCleaned,
                analyticsCleaned
            });
        } catch (error) {
            logger.error('Error during cleanup:', error);
        }
    });

    // Schedule digest emails daily at 9 AM
    const digestJob = new cron.CronJob(DIGEST_CRON, async () => {
        try {
            logger.info('Scheduling digest emails...');
            const queueService = QueueService.getInstance();
            await queueService.scheduleDigestJobs();
            logger.info('Digest emails scheduled');
        } catch (error) {
            logger.error('Error scheduling digest emails:', error);
        }
    });

    // Start cron jobs
    cleanupJob.start();
    digestJob.start();

    logger.info('Cron jobs started', {
        cleanup: 'Daily at 2:00 AM',
        digest: 'Daily at 9:00 AM'
    });
}

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully...');

    try {
        // Close queue connections
        const queueService = QueueService.getInstance();
        await queueService.shutdown();
        console.log('✓ Queue service shut down');

        // Close Redis connections
        const redis = RedisManager.getInstance();
        await redis.disconnect();
        console.log('✓ Redis disconnected');

        console.log('✓ Graceful shutdown completed');
        process.exit(0);
    } catch (error) {
        console.error('Error during shutdown:', error);
        process.exit(1);
    }
});

process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down gracefully...');

    try {
        // Close queue connections
        const queueService = QueueService.getInstance();
        await queueService.shutdown();
        console.log('✓ Queue service shut down');

        // Close Redis connections
        const redis = RedisManager.getInstance();
        await redis.disconnect();
        console.log('✓ Redis disconnected');

        console.log('✓ Graceful shutdown completed');
        process.exit(0);
    } catch (error) {
        console.error('Error during shutdown:', error);
        process.exit(1);
    }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Start the server
async function startServer() {
    await initializeServices();

    app.listen(PORT, () => {
        console.log(`🚀 Notification Service running on port ${PORT}`);
        console.log(`📧 Email notifications: ${process.env.SMTP_HOST ? 'Enabled' : 'Disabled'}`);
        console.log(`📊 Redis: ${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`);
        console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
}

// Start the application
startServer().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
});