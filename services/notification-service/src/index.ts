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
import notificationRoutes from './routes/notifications';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3005;

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
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
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
app.use((error: any, req: any, res: any, next: any) => {
    console.error('Unhandled error:', error);
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Not found',
        message: `Route ${req.method} ${req.originalUrl} not found`
    });
});

// Initialize services
async function initializeServices() {
    try {
        console.log('Initializing Notification Service...');

        // Initialize Redis connection
        const redis = RedisManager.getInstance();
        await redis.connect();
        console.log('✓ Redis connected');

        // Verify email configuration
        const emailConfig = EmailConfig.getInstance();
        const emailVerified = await emailConfig.verifyConnection();
        if (emailVerified) {
            console.log('✓ Email configuration verified');
        } else {
            console.warn('⚠ Email configuration could not be verified');
        }

        // Initialize queue service
        const queueService = QueueService.getInstance();
        await queueService.initialize();
        console.log('✓ Queue service initialized');

        // Initialize other services
        const notificationService = NotificationService.getInstance();
        const analyticsService = AnalyticsService.getInstance();
        console.log('✓ Core services initialized');

        // Set up cron jobs
        setupCronJobs();
        console.log('✓ Cron jobs scheduled');

        console.log('🚀 Notification Service fully initialized');
    } catch (error) {
        console.error('Failed to initialize services:', error);
        process.exit(1);
    }
}

function setupCronJobs() {
    // Clean up expired notifications daily at 2 AM
    const cleanupJob = new cron.CronJob('0 2 * * *', async () => {
        try {
            console.log('Running notification cleanup...');
            const notificationService = NotificationService.getInstance();
            const analyticsService = AnalyticsService.getInstance();

            const [notificationsCleaned, analyticsCleaned] = await Promise.all([
                notificationService.cleanupExpiredNotifications(),
                analyticsService.cleanupOldAnalytics()
            ]);

            console.log(`Cleanup completed: ${notificationsCleaned} notifications, ${analyticsCleaned} analytics records`);
        } catch (error) {
            console.error('Error during cleanup:', error);
        }
    });

    // Schedule digest emails daily at 9 AM
    const digestJob = new cron.CronJob('0 9 * * *', async () => {
        try {
            console.log('Scheduling digest emails...');
            const queueService = QueueService.getInstance();
            await queueService.scheduleDigestJobs();
            console.log('Digest emails scheduled');
        } catch (error) {
            console.error('Error scheduling digest emails:', error);
        }
    });

    // Start cron jobs
    cleanupJob.start();
    digestJob.start();

    console.log('Cron jobs started:');
    console.log('- Cleanup: Daily at 2:00 AM');
    console.log('- Digest emails: Daily at 9:00 AM');
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