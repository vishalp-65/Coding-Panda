import Bull from 'bull';
import { RedisManager } from '../config/redis';
import { NotificationData, NotificationJob, DigestData, NotificationChannel } from '../types';
import { EmailService } from './EmailService';
import { NotificationService } from './NotificationService';
import { AnalyticsService } from './AnalyticsService';

export class QueueService {
    private static instance: QueueService;
    private notificationQueue: Bull.Queue;
    private emailQueue: Bull.Queue;
    private digestQueue: Bull.Queue;
    private redis: RedisManager;
    private emailService: EmailService;
    private notificationService?: NotificationService;
    private analyticsService: AnalyticsService;

    private constructor() {
        this.redis = RedisManager.getInstance();

        const redisConfig = {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
            password: process.env.REDIS_PASSWORD || undefined,
        };

        // Initialize queues
        this.notificationQueue = new Bull('notification processing', {
            redis: redisConfig,
            defaultJobOptions: {
                attempts: parseInt(process.env.QUEUE_ATTEMPTS || '3'),
                backoff: {
                    type: 'exponential',
                    delay: parseInt(process.env.QUEUE_DELAY || '5000'),
                },
                removeOnComplete: 100,
                removeOnFail: 50,
            },
        });

        this.emailQueue = new Bull('email processing', {
            redis: redisConfig,
            defaultJobOptions: {
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 10000,
                },
                removeOnComplete: 100,
                removeOnFail: 50,
            },
        });

        this.digestQueue = new Bull('digest processing', {
            redis: redisConfig,
            defaultJobOptions: {
                attempts: 2,
                backoff: {
                    type: 'fixed',
                    delay: 30000,
                },
                removeOnComplete: 50,
                removeOnFail: 25,
            },
        });

        this.emailService = EmailService.getInstance();
        this.analyticsService = AnalyticsService.getInstance();
    }

    public static getInstance(): QueueService {
        if (!QueueService.instance) {
            QueueService.instance = new QueueService();
        }
        return QueueService.instance;
    }

    public setNotificationService(notificationService: NotificationService): void {
        this.notificationService = notificationService;
    }

    public async initialize(): Promise<void> {
        // Set up queue processors
        await this.setupNotificationProcessor();
        await this.setupEmailProcessor();
        await this.setupDigestProcessor();

        // Set up queue event listeners
        this.setupEventListeners();

        console.log('Queue service initialized');
    }

    private async setupNotificationProcessor(): Promise<void> {
        this.notificationQueue.process('send_notification',
            parseInt(process.env.QUEUE_CONCURRENCY || '5'),
            async (job) => {
                const { notification } = job.data;

                try {
                    // Store notification in database/cache
                    await this.redis.storeNotification(notification);

                    // Send real-time notification if user is online
                    if (this.notificationService) {
                        await this.notificationService.sendRealTimeNotification(notification);
                    }

                    // Track analytics
                    await this.analyticsService.trackNotificationEvent(notification.id, notification.userId, 'sent', notification.channel);

                    return { success: true, notificationId: notification.id };
                } catch (error: any) {
                    console.error('Error processing notification:', error);
                    await this.analyticsService.trackNotificationEvent(notification.id, notification.userId, 'failed', notification.channel, { error: error.message });
                    throw error;
                }
            }
        );
    }

    private async setupEmailProcessor(): Promise<void> {
        this.emailQueue.process('send_email',
            parseInt(process.env.QUEUE_CONCURRENCY || '5'),
            async (job) => {
                const { to, subject, html, text, templateId, templateData } = job.data;

                try {
                    let emailContent = { html, text };

                    // If template is specified, render it
                    if (templateId && templateData) {
                        emailContent = await this.emailService.renderTemplate(templateId, templateData);
                    }

                    await this.emailService.sendEmail({
                        to,
                        subject,
                        html: emailContent.html,
                        text: emailContent.text
                    });

                    // Track analytics if notification ID is provided
                    if (job.data.notificationId) {
                        await this.analyticsService.trackNotificationEvent(
                            job.data.notificationId,
                            job.data.userId,
                            'delivered',
                            NotificationChannel.EMAIL
                        );
                    }

                    return { success: true, to };
                } catch (error: any) {
                    console.error('Error sending email:', error);

                    if (job.data.notificationId) {
                        await this.analyticsService.trackNotificationEvent(
                            job.data.notificationId,
                            job.data.userId,
                            'failed',
                            NotificationChannel.EMAIL,
                            { error: error.message }
                        );
                    }

                    throw error;
                }
            }
        );
    }

    private async setupDigestProcessor(): Promise<void> {
        this.digestQueue.process('generate_digest', 2, async (job) => {
            const { userId, period } = job.data;

            try {
                const digestData = await this.generateDigestData(userId, period);

                if (digestData.notifications.length > 0 || digestData.achievements.length > 0) {
                    // Send digest email
                    await this.emailQueue.add('send_email', {
                        to: await this.getUserEmail(userId),
                        templateId: 'daily_digest',
                        templateData: digestData,
                        userId,
                        notificationId: `digest_${userId}_${Date.now()}`
                    });
                }

                return { success: true, userId, notificationsCount: digestData.notifications.length };
            } catch (error) {
                console.error('Error generating digest:', error);
                throw error;
            }
        });
    }

    private setupEventListeners(): void {
        // Notification queue events
        this.notificationQueue.on('completed', (job, result) => {
            console.log(`Notification job ${job.id} completed:`, result);
        });

        this.notificationQueue.on('failed', (job, err) => {
            console.error(`Notification job ${job.id} failed:`, err);
        });

        // Email queue events
        this.emailQueue.on('completed', (job, result) => {
            console.log(`Email job ${job.id} completed:`, result);
        });

        this.emailQueue.on('failed', (job, err) => {
            console.error(`Email job ${job.id} failed:`, err);
        });

        // Digest queue events
        this.digestQueue.on('completed', (job, result) => {
            console.log(`Digest job ${job.id} completed:`, result);
        });

        this.digestQueue.on('failed', (job, err) => {
            console.error(`Digest job ${job.id} failed:`, err);
        });
    }

    // Public methods for adding jobs
    public async addNotificationJob(notification: NotificationData, delay?: number): Promise<Bull.Job> {
        return this.notificationQueue.add('send_notification',
            { notification },
            { delay }
        );
    }

    public async addEmailJob(emailData: any, delay?: number): Promise<Bull.Job> {
        return this.emailQueue.add('send_email', emailData, { delay });
    }

    public async addDigestJob(userId: string, period: 'daily' | 'weekly', delay?: number): Promise<Bull.Job> {
        return this.digestQueue.add('generate_digest',
            { userId, period },
            { delay }
        );
    }

    public async scheduleDigestJobs(): Promise<void> {
        // This would typically be called by a cron job
        // Get all users who have digest enabled
        const users = await this.getUsersWithDigestEnabled();

        for (const user of users) {
            const preferences = await this.redis.getUserPreferences(user.id);
            if (preferences?.digestEmail && preferences?.digestFrequency !== 'never') {
                const delay = this.calculateDigestDelay(preferences.digestFrequency);
                await this.addDigestJob(user.id, preferences.digestFrequency, delay);
            }
        }
    }

    private async generateDigestData(userId: string, period: 'daily' | 'weekly'): Promise<DigestData> {
        const now = new Date();
        const startDate = new Date();

        if (period === 'daily') {
            startDate.setDate(now.getDate() - 1);
        } else {
            startDate.setDate(now.getDate() - 7);
        }

        // Get notifications from the period
        const notifications = await this.redis.getUserNotifications(userId, 100);
        const periodNotifications = notifications.filter(n =>
            n.createdAt >= startDate && n.createdAt <= now
        );

        // Get achievements and other data (would integrate with other services)
        const achievements = await this.getRecentAchievements(userId, startDate);
        const contestUpdates = await this.getRecentContestUpdates(userId, startDate);
        const learningProgress = await this.getRecentLearningProgress(userId, startDate);

        return {
            userId,
            period,
            notifications: periodNotifications,
            achievements,
            contestUpdates,
            learningProgress,
            generatedAt: now
        };
    }

    private async getUserEmail(userId: string): Promise<string> {
        // This would integrate with the user service
        // For now, return a placeholder
        return `user${userId}@example.com`;
    }

    private async getUsersWithDigestEnabled(): Promise<{ id: string }[]> {
        // This would integrate with the user service to get users with digest enabled
        // For now, return empty array
        return [];
    }

    private calculateDigestDelay(frequency: 'daily' | 'weekly'): number {
        const now = new Date();
        const digestHour = parseInt(process.env.DIGEST_EMAIL_HOUR || '9');

        let targetTime = new Date();
        targetTime.setHours(digestHour, 0, 0, 0);

        if (frequency === 'daily') {
            if (targetTime <= now) {
                targetTime.setDate(targetTime.getDate() + 1);
            }
        } else {
            // Weekly - send on Monday
            const daysUntilMonday = (1 + 7 - now.getDay()) % 7;
            targetTime.setDate(targetTime.getDate() + daysUntilMonday);
            if (daysUntilMonday === 0 && targetTime <= now) {
                targetTime.setDate(targetTime.getDate() + 7);
            }
        }

        return targetTime.getTime() - now.getTime();
    }

    private async getRecentAchievements(userId: string, since: Date): Promise<any[]> {
        // This would integrate with the analytics service
        return [];
    }

    private async getRecentContestUpdates(userId: string, since: Date): Promise<any[]> {
        // This would integrate with the contest service
        return [];
    }

    private async getRecentLearningProgress(userId: string, since: Date): Promise<any[]> {
        // This would integrate with the AI analysis service
        return [];
    }

    // Queue management methods
    public async getQueueStats(): Promise<any> {
        const [notificationStats, emailStats, digestStats] = await Promise.all([
            this.notificationQueue.getJobCounts(),
            this.emailQueue.getJobCounts(),
            this.digestQueue.getJobCounts()
        ]);

        return {
            notification: notificationStats,
            email: emailStats,
            digest: digestStats
        };
    }

    public async pauseQueues(): Promise<void> {
        await Promise.all([
            this.notificationQueue.pause(),
            this.emailQueue.pause(),
            this.digestQueue.pause()
        ]);
    }

    public async resumeQueues(): Promise<void> {
        await Promise.all([
            this.notificationQueue.resume(),
            this.emailQueue.resume(),
            this.digestQueue.resume()
        ]);
    }

    public async shutdown(): Promise<void> {
        await Promise.all([
            this.notificationQueue.close(),
            this.emailQueue.close(),
            this.digestQueue.close()
        ]);
    }
}