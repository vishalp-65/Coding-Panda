import { v4 as uuidv4 } from 'uuid';
import { RedisManager } from '../config/redis';
import { QueueService } from './QueueService';
import { EmailService } from './EmailService';
import { AnalyticsService } from './AnalyticsService';
import { PreferencesService } from './PreferencesService';
import {
    NotificationData,
    NotificationType,
    NotificationChannel,
    NotificationPriority,
    CreateNotificationRequest,
    NotificationPreferences
} from '../types';
import axios from 'axios';

export class NotificationService {
    private static instance: NotificationService;
    private redis: RedisManager;
    private queueService: QueueService;
    private emailService: EmailService;
    private analyticsService: AnalyticsService;
    private preferencesService: PreferencesService;

    private constructor() {
        this.redis = RedisManager.getInstance();
        this.queueService = QueueService.getInstance();
        this.emailService = EmailService.getInstance();
        this.analyticsService = AnalyticsService.getInstance();
        this.preferencesService = PreferencesService.getInstance();

        // Set this instance in queue service for real-time notifications
        this.queueService.setNotificationService(this);
    }

    public static getInstance(): NotificationService {
        if (!NotificationService.instance) {
            NotificationService.instance = new NotificationService();
        }
        return NotificationService.instance;
    }

    public async createNotification(request: CreateNotificationRequest): Promise<string[]> {
        const notificationIds: string[] = [];

        // Determine target users
        let targetUsers: string[] = [];
        if (request.userId) {
            targetUsers = [request.userId];
        } else if (request.userIds) {
            targetUsers = request.userIds;
        } else {
            throw new Error('Either userId or userIds must be provided');
        }

        // Create notifications for each user
        for (const userId of targetUsers) {
            const notificationId = await this.createSingleNotification(userId, request);
            notificationIds.push(notificationId);
        }

        return notificationIds;
    }

    private async createSingleNotification(userId: string, request: CreateNotificationRequest): Promise<string> {
        // Get user preferences
        const preferences = await this.preferencesService.getUserPreferences(userId);

        // Check if user wants this type of notification
        if (!this.shouldSendNotification(request.type, request.channel, preferences)) {
            console.log(`Notification ${request.type} skipped for user ${userId} due to preferences`);
            return '';
        }

        // Check quiet hours
        if (preferences && this.isInQuietHours(preferences)) {
            console.log(`Notification delayed for user ${userId} due to quiet hours`);
            // Schedule for later (after quiet hours end)
            const delay = this.calculateQuietHoursDelay(preferences);
            return this.scheduleNotification(userId, request, delay);
        }

        const notificationId = uuidv4();
        const now = new Date();

        const notification: NotificationData = {
            id: notificationId,
            userId,
            type: request.type,
            channel: request.channel,
            priority: request.priority,
            title: request.title,
            message: request.message,
            data: request.data,
            read: false,
            createdAt: now,
            expiresAt: request.expiresAt,
            templateId: request.templateId
        };

        // Schedule or send immediately
        if (request.scheduleAt && request.scheduleAt > now) {
            const delay = request.scheduleAt.getTime() - now.getTime();
            await this.queueService.addNotificationJob(notification, delay);
        } else {
            await this.queueService.addNotificationJob(notification);
        }

        // If email channel is requested, also queue email
        if (request.channel === NotificationChannel.EMAIL || request.channel === NotificationChannel.BOTH) {
            await this.queueEmailNotification(notification, preferences);
        }

        return notificationId;
    }

    private async scheduleNotification(userId: string, request: CreateNotificationRequest, delay: number): Promise<string> {
        const notificationId = uuidv4();
        const notification: NotificationData = {
            id: notificationId,
            userId,
            type: request.type,
            channel: request.channel,
            priority: request.priority,
            title: request.title,
            message: request.message,
            data: request.data,
            read: false,
            createdAt: new Date(),
            expiresAt: request.expiresAt,
            templateId: request.templateId
        };

        await this.queueService.addNotificationJob(notification, delay);
        return notificationId;
    }

    private shouldSendNotification(
        type: NotificationType,
        channel: NotificationChannel,
        preferences: NotificationPreferences | null
    ): boolean {
        if (!preferences) return true; // Default to sending if no preferences

        // Check global preferences
        if (channel === NotificationChannel.EMAIL && !preferences.emailNotifications) {
            return false;
        }
        if (channel === NotificationChannel.IN_APP && !preferences.inAppNotifications) {
            return false;
        }

        // Check type-specific preferences
        const typePrefs = preferences.notificationTypes[type];
        if (!typePrefs || !typePrefs.enabled) {
            return false;
        }

        // Check if the channel is allowed for this type
        if (!typePrefs.channels.includes(channel) && !typePrefs.channels.includes(NotificationChannel.BOTH)) {
            return false;
        }

        return true;
    }

    private isInQuietHours(preferences: NotificationPreferences | null): boolean {
        if (!preferences?.quietHours) return false;

        const now = new Date();
        const userTimezone = preferences.quietHours.timezone || 'UTC';

        // Convert current time to user's timezone
        const userTime = new Date(now.toLocaleString('en-US', { timeZone: userTimezone }));
        const currentHour = userTime.getHours();
        const currentMinute = userTime.getMinutes();
        const currentTime = currentHour * 60 + currentMinute;

        const [startHour, startMinute] = preferences.quietHours.start.split(':').map(Number);
        const [endHour, endMinute] = preferences.quietHours.end.split(':').map(Number);
        const startTime = startHour * 60 + startMinute;
        const endTime = endHour * 60 + endMinute;

        if (startTime <= endTime) {
            // Same day quiet hours (e.g., 22:00 to 08:00 next day)
            return currentTime >= startTime && currentTime <= endTime;
        } else {
            // Overnight quiet hours (e.g., 22:00 to 08:00 next day)
            return currentTime >= startTime || currentTime <= endTime;
        }
    }

    private calculateQuietHoursDelay(preferences: NotificationPreferences): number {
        if (!preferences.quietHours) return 0;

        const now = new Date();
        const userTimezone = preferences.quietHours.timezone || 'UTC';
        const [endHour, endMinute] = preferences.quietHours.end.split(':').map(Number);

        // Calculate when quiet hours end
        const endTime = new Date(now.toLocaleString('en-US', { timeZone: userTimezone }));
        endTime.setHours(endHour, endMinute, 0, 0);

        // If end time is before current time, it's tomorrow
        if (endTime <= now) {
            endTime.setDate(endTime.getDate() + 1);
        }

        return endTime.getTime() - now.getTime();
    }

    private async queueEmailNotification(notification: NotificationData, preferences: NotificationPreferences | null): Promise<void> {
        try {
            // Get user email (would integrate with user service)
            const userEmail = await this.getUserEmail(notification.userId);
            if (!userEmail) {
                console.warn(`No email found for user ${notification.userId}`);
                return;
            }

            let emailData: any = {
                to: userEmail,
                userId: notification.userId,
                notificationId: notification.id
            };

            if (notification.templateId) {
                // Use template
                emailData.templateId = notification.templateId;
                emailData.templateData = {
                    username: await this.getUserName(notification.userId),
                    title: notification.title,
                    message: notification.message,
                    ...notification.data
                };
            } else {
                // Use simple email format
                emailData.subject = notification.title;
                emailData.html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>${notification.title}</h2>
            <p>${notification.message}</p>
            <hr style="margin: 20px 0;">
            <p style="font-size: 12px; color: #666;">
              This notification was sent by AI Platform.
            </p>
          </div>
        `;
                emailData.text = `${notification.title}\n\n${notification.message}\n\n---\nThis notification was sent by AI Platform.`;
            }

            await this.queueService.addEmailJob(emailData);
        } catch (error) {
            console.error('Error queueing email notification:', error);
        }
    }

    public async sendRealTimeNotification(notification: NotificationData): Promise<void> {
        try {
            // Send to realtime service via HTTP
            const realtimeServiceUrl = process.env.REALTIME_SERVICE_URL || 'http://localhost:3004';

            await axios.post(`${realtimeServiceUrl}/api/notifications/send`, {
                userId: notification.userId,
                notification: {
                    id: notification.id,
                    type: notification.type,
                    title: notification.title,
                    message: notification.message,
                    data: notification.data,
                    createdAt: notification.createdAt
                }
            });

            // Track delivery
            await this.analyticsService.trackNotificationEvent(
                notification.id,
                notification.userId,
                'delivered',
                NotificationChannel.IN_APP
            );
        } catch (error) {
            console.error('Error sending real-time notification:', error);
            // Don't throw - this is not critical
        }
    }

    // Notification retrieval methods
    public async getUserNotifications(userId: string, limit = 50, offset = 0): Promise<NotificationData[]> {
        return await this.redis.getUserNotifications(userId, limit, offset);
    }

    public async getNotification(notificationId: string): Promise<NotificationData | null> {
        return await this.redis.getNotification(notificationId);
    }

    public async markAsRead(notificationId: string, userId: string): Promise<void> {
        await this.redis.markNotificationAsRead(notificationId, userId);
        await this.analyticsService.trackNotificationEvent(notificationId, userId, 'read', NotificationChannel.IN_APP);
    }

    public async markAllAsRead(userId: string): Promise<void> {
        const notifications = await this.redis.getUserNotifications(userId, 1000);
        const unreadNotifications = notifications.filter(n => !n.read);

        for (const notification of unreadNotifications) {
            await this.redis.markNotificationAsRead(notification.id, userId);
            await this.analyticsService.trackNotificationEvent(notification.id, userId, 'read', NotificationChannel.IN_APP);
        }
    }

    public async getUnreadCount(userId: string): Promise<number> {
        return await this.redis.getUnreadCount(userId);
    }

    // Predefined notification methods
    public async sendContestStartNotification(contestId: string, contestTitle: string, participantIds: string[]): Promise<void> {
        await this.createNotification({
            userIds: participantIds,
            type: NotificationType.CONTEST_START,
            channel: NotificationChannel.BOTH,
            priority: NotificationPriority.HIGH,
            title: 'Contest Started!',
            message: `The contest "${contestTitle}" has started. Good luck!`,
            data: { contestId, contestTitle },
            templateId: 'contest_start'
        });
    }

    public async sendAchievementNotification(userId: string, achievementTitle: string, achievementDescription: string): Promise<void> {
        await this.createNotification({
            userId,
            type: NotificationType.ACHIEVEMENT,
            channel: NotificationChannel.BOTH,
            priority: NotificationPriority.MEDIUM,
            title: 'Achievement Unlocked!',
            message: `You've earned the "${achievementTitle}" achievement!`,
            data: { achievementTitle, achievementDescription },
            templateId: 'achievement_unlocked'
        });
    }

    public async sendSubmissionResultNotification(
        userId: string,
        problemTitle: string,
        status: string,
        score?: number
    ): Promise<void> {
        const message = status === 'accepted'
            ? `Your solution to "${problemTitle}" was accepted!${score ? ` Score: ${score}` : ''}`
            : `Your solution to "${problemTitle}" was ${status}. Try again!`;

        await this.createNotification({
            userId,
            type: NotificationType.SUBMISSION_RESULT,
            channel: NotificationChannel.IN_APP,
            priority: NotificationPriority.MEDIUM,
            title: 'Submission Result',
            message,
            data: { problemTitle, status, score }
        });
    }

    // Utility methods
    private async getUserEmail(userId: string): Promise<string | null> {
        try {
            // This would integrate with the user service
            const userServiceUrl = process.env.USER_SERVICE_URL || 'http://localhost:3001';
            const response = await axios.get(`${userServiceUrl}/api/users/${userId}`);
            return response.data.email;
        } catch (error) {
            console.error(`Error fetching email for user ${userId}:`, error);
            return null;
        }
    }

    private async getUserName(userId: string): Promise<string> {
        try {
            // This would integrate with the user service
            const userServiceUrl = process.env.USER_SERVICE_URL || 'http://localhost:3001';
            const response = await axios.get(`${userServiceUrl}/api/users/${userId}`);
            return response.data.username || response.data.name || 'User';
        } catch (error) {
            console.error(`Error fetching name for user ${userId}:`, error);
            return 'User';
        }
    }

    // Cleanup methods
    public async cleanupExpiredNotifications(): Promise<number> {
        return await this.redis.cleanupExpiredNotifications();
    }

    // Bulk operations
    public async sendBulkNotifications(requests: CreateNotificationRequest[]): Promise<string[]> {
        const allNotificationIds: string[] = [];

        for (const request of requests) {
            const notificationIds = await this.createNotification(request);
            allNotificationIds.push(...notificationIds);
        }

        return allNotificationIds;
    }
}