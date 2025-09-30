import { NotificationService } from '../../src/services/NotificationService';
import { NotificationType, NotificationChannel, NotificationPriority } from '../../src/types';
import { mockNotificationData } from '../setup';

describe('NotificationService', () => {
    let notificationService: NotificationService;

    beforeEach(() => {
        notificationService = NotificationService.getInstance();
    });

    describe('createNotification', () => {
        it('should create a notification for a single user', async () => {
            const request = {
                userId: 'test-user-id',
                type: NotificationType.CONTEST_START,
                channel: NotificationChannel.BOTH,
                priority: NotificationPriority.HIGH,
                title: 'Test Notification',
                message: 'This is a test notification'
            };

            const notificationIds = await notificationService.createNotification(request);

            expect(notificationIds).toHaveLength(1);
            expect(notificationIds[0]).toBeDefined();
        });

        it('should create notifications for multiple users', async () => {
            const request = {
                userIds: ['user1', 'user2', 'user3'],
                type: NotificationType.ACHIEVEMENT,
                channel: NotificationChannel.IN_APP,
                priority: NotificationPriority.MEDIUM,
                title: 'Achievement Unlocked',
                message: 'You earned a new achievement!'
            };

            const notificationIds = await notificationService.createNotification(request);

            expect(notificationIds).toHaveLength(3);
        });

        it('should throw error when neither userId nor userIds provided', async () => {
            const request = {
                type: NotificationType.SYSTEM,
                channel: NotificationChannel.EMAIL,
                priority: NotificationPriority.LOW,
                title: 'System Notification',
                message: 'System message'
            };

            await expect(notificationService.createNotification(request)).rejects.toThrow(
                'Either userId or userIds must be provided'
            );
        });
    });

    describe('getUserNotifications', () => {
        it('should retrieve user notifications with default pagination', async () => {
            const userId = 'test-user-id';

            const notifications = await notificationService.getUserNotifications(userId);

            expect(notifications).toBeDefined();
            expect(Array.isArray(notifications)).toBe(true);
        });

        it('should retrieve user notifications with custom pagination', async () => {
            const userId = 'test-user-id';
            const limit = 10;
            const offset = 5;

            const notifications = await notificationService.getUserNotifications(userId, limit, offset);

            expect(notifications).toBeDefined();
            expect(Array.isArray(notifications)).toBe(true);
        });
    });

    describe('markAsRead', () => {
        it('should mark a notification as read', async () => {
            const notificationId = 'test-notification-id';
            const userId = 'test-user-id';

            await expect(notificationService.markAsRead(notificationId, userId)).resolves.not.toThrow();
        });
    });

    describe('markAllAsRead', () => {
        it('should mark all notifications as read for a user', async () => {
            const userId = 'test-user-id';

            await expect(notificationService.markAllAsRead(userId)).resolves.not.toThrow();
        });
    });

    describe('getUnreadCount', () => {
        it('should return unread count for a user', async () => {
            const userId = 'test-user-id';

            const count = await notificationService.getUnreadCount(userId);

            expect(typeof count).toBe('number');
            expect(count).toBeGreaterThanOrEqual(0);
        });
    });

    describe('predefined notification methods', () => {
        it('should send contest start notification', async () => {
            const contestId = 'test-contest-id';
            const contestTitle = 'Test Contest';
            const participantIds = ['user1', 'user2'];

            await expect(
                notificationService.sendContestStartNotification(contestId, contestTitle, participantIds)
            ).resolves.not.toThrow();
        });

        it('should send achievement notification', async () => {
            const userId = 'test-user-id';
            const achievementTitle = 'First Problem Solved';
            const achievementDescription = 'Solved your first coding problem';

            await expect(
                notificationService.sendAchievementNotification(userId, achievementTitle, achievementDescription)
            ).resolves.not.toThrow();
        });

        it('should send submission result notification', async () => {
            const userId = 'test-user-id';
            const problemTitle = 'Two Sum';
            const status = 'accepted';
            const score = 100;

            await expect(
                notificationService.sendSubmissionResultNotification(userId, problemTitle, status, score)
            ).resolves.not.toThrow();
        });
    });

    describe('bulk operations', () => {
        it('should send bulk notifications', async () => {
            const requests = [
                {
                    userId: 'user1',
                    type: NotificationType.SYSTEM,
                    channel: NotificationChannel.IN_APP,
                    priority: NotificationPriority.LOW,
                    title: 'System Update',
                    message: 'System maintenance scheduled'
                },
                {
                    userId: 'user2',
                    type: NotificationType.ACHIEVEMENT,
                    channel: NotificationChannel.BOTH,
                    priority: NotificationPriority.MEDIUM,
                    title: 'Achievement',
                    message: 'New achievement unlocked'
                }
            ];

            const notificationIds = await notificationService.sendBulkNotifications(requests);

            expect(notificationIds).toHaveLength(2);
        });
    });

    describe('cleanup', () => {
        it('should cleanup expired notifications', async () => {
            const cleanedCount = await notificationService.cleanupExpiredNotifications();

            expect(typeof cleanedCount).toBe('number');
            expect(cleanedCount).toBeGreaterThanOrEqual(0);
        });
    });
});