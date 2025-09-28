import app, { initializeApp } from './app';
import cron from 'node-cron';
import { BehaviorAnalysisService } from './services/BehaviorAnalysisService';
import { DashboardService } from './services/DashboardService';

const PORT = process.env.PORT || 3005;

const behaviorAnalysisService = new BehaviorAnalysisService();
const dashboardService = new DashboardService();

// Scheduled tasks
const setupScheduledTasks = (): void => {
    // Update user behavior patterns every hour
    cron.schedule('0 * * * *', async () => {
        console.log('Running scheduled behavior analysis update...');
        try {
            // This would typically process a batch of users
            // For now, it's a placeholder for the scheduled task
            console.log('Behavior analysis update completed');
        } catch (error) {
            console.error('Error in scheduled behavior analysis:', error);
        }
    });

    // Generate daily engagement metrics at midnight
    cron.schedule('0 0 * * *', async () => {
        console.log('Running daily engagement metrics calculation...');
        try {
            // This would calculate and store daily engagement metrics
            console.log('Daily engagement metrics calculation completed');
        } catch (error) {
            console.error('Error in daily engagement metrics calculation:', error);
        }
    });

    // Clean up old analytics data weekly
    cron.schedule('0 2 * * 0', async () => {
        console.log('Running weekly data cleanup...');
        try {
            // This would clean up old analytics data based on retention policy
            console.log('Weekly data cleanup completed');
        } catch (error) {
            console.error('Error in weekly data cleanup:', error);
        }
    });

    console.log('Scheduled tasks initialized');
};

const startServer = async (): Promise<void> => {
    try {
        await initializeApp();
        setupScheduledTasks();

        app.listen(PORT, () => {
            console.log(`Analytics service running on port ${PORT}`);
            console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
        });
    } catch (error) {
        console.error('Failed to start analytics service:', error);
        process.exit(1);
    }
};

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    process.exit(0);
});

startServer();