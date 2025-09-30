import { AnalyticsService } from '../../src/services/AnalyticsService';
import { NotificationChannel, NotificationType } from '../../src/types';

describe('AnalyticsService', () => {
    let analyticsService: AnalyticsService;

    beforeEach(() => {
        analyticsService = AnalyticsService.getInstance();
    });

    describe('trackNotificationEvent', () => {
        it('should track notification sent event', async () => {
            const notificationId = 'test-notification-id';
            const userId = 'test-user-id';
            const event = 'sent';
            const channel = NotificationChannel.EMAIL;

            await expect(
                analyticsService.trackNotificationEvent(notificationId, userId, event, channel)
            ).resolves.not.toThrow();
        });

        it('should track notification delivered event', async () => {
            const notificationId = 'test-notification-id';
            const userId = 'test-user-id';
            const event = 'delivered';
            const channel = NotificationChannel.IN_APP;

            await expect(
                analyticsService.trackNotificationEvent(notificationId, userId, event, channel)
            ).resolves.not.toThrow();
        });

        it('should track notification read event', async () => {
            const notificationId = 'test-notification-id';
            const userId = 'test-user-id';
            const event = 'read';
            const channel = NotificationChannel.IN_APP;

            await expect(
                analyticsService.trackNotificationEvent(notificationId, userId, event, channel)
            ).resolves.not.toThrow();
        });

        it('should track notification failed event with metadata', async () => {
            const notificationId = 'test-notification-id';
            const userId = 'test-user-id';
            const event = 'failed';
            const channel = NotificationChannel.EMAIL;
            const metadata = { error: 'SMTP connection failed' };

            await expect(
                analyticsService.trackNotificationEvent(notificationId, userId, event, channel, metadata)
            ).resolves.not.toThrow();
        });
    });

    describe('getNotificationStats', () => {
        it('should get overall notification stats', async () => {
            const stats = await analyticsService.getNotificationStats();

            expect(stats).toBeDefined();
            expect(stats).toHaveProperty('totalSent');
            expect(stats).toHaveProperty('totalDelivered');
            expect(stats).toHaveProperty('totalRead');
            expect(stats).toHaveProperty('totalFailed');
            expect(stats).toHaveProperty('deliveryRate');
            expect(stats).toHaveProperty('readRate');
            expect(stats).toHaveProperty('byType');
            expect(stats).toHaveProperty('byChannel');

            expect(typeof stats.totalSent).toBe('number');
            expect(typeof stats.deliveryRate).toBe('number');
            expect(typeof stats.readRate).toBe('number');
        });

        it('should get notification stats for date range', async () => {
            const startDate = new Date('2024-01-01');
            const endDate = new Date('2024-01-31');

            const stats = await analyticsService.getNotificationStats(startDate, endDate);

            expect(stats).toBeDefined();
            expect(stats.totalSent).toBeGreaterThanOrEqual(0);
        });

        it('should get notification stats for specific user', async () => {
            const userId = 'test-user-id';

            const stats = await analyticsService.getNotificationStats(undefined, undefined, userId);

            expect(stats).toBeDefined();
            expect(stats.totalSent).toBeGreaterThanOrEqual(0);
        });
    });

    describe('getUserEngagementStats', () => {
        it('should get user engagement stats with default period', async () => {
            const userId = 'test-user-id';

            const stats = await analyticsService.getUserEngagementStats(userId);

            expect(stats).toBeDefined();
            expect(stats).toHaveProperty('totalNotifications');
            expect(stats).toHaveProperty('readNotifications');
            expect(stats).toHaveProperty('clickedNotifications');
            expect(stats).toHaveProperty('readRate');
            expect(stats).toHaveProperty('clickRate');
            expect(stats).toHaveProperty('dailyActivity');

            expect(typeof stats.totalNotifications).toBe('number');
            expect(typeof stats.readRate).toBe('number');
            expect(Array.isArray(stats.dailyActivity)).toBe(true);
        });

        it('should get user engagement stats for custom period', async () => {
            const userId = 'test-user-id';
            const days = 7;

            const stats = await analyticsService.getUserEngagementStats(userId, days);

            expect(stats).toBeDefined();
            expect(stats.dailyActivity.length).toBeLessThanOrEqual(days);
        });
    });

    describe('getTopPerformingNotificationTypes', () => {
        it('should get top performing notification types with default limit', async () => {
            const topTypes = await analyticsService.getTopPerformingNotificationTypes();

            expect(Array.isArray(topTypes)).toBe(true);
            expect(topTypes.length).toBeLessThanOrEqual(10);

            if (topTypes.length > 0) {
                expect(topTypes[0]).toHaveProperty('type');
                expect(topTypes[0]).toHaveProperty('sent');
                expect(topTypes[0]).toHaveProperty('read');
                expect(topTypes[0]).toHaveProperty('readRate');
            }
        });

        it('should get top performing notification types with custom limit', async () => {
            const limit = 5;
            const topTypes = await analyticsService.getTopPerformingNotificationTypes(limit);

            expect(Array.isArray(topTypes)).toBe(true);
            expect(topTypes.length).toBeLessThanOrEqual(limit);
        });
    });

    describe('getChannelPerformance', () => {
        it('should get performance stats for all channels', async () => {
            const performance = await analyticsService.getChannelPerformance();

            expect(performance).toBeDefined();
            expect(typeof performance).toBe('object');

            // Check if all channels are represented
            Object.values(NotificationChannel).forEach(channel => {
                if (performance[channel]) {
                    expect(performance[channel]).toHaveProperty('sent');
                    expect(performance[channel]).toHaveProperty('delivered');
                    expect(performance[channel]).toHaveProperty('read');
                    expect(performance[channel]).toHaveProperty('failed');
                    expect(performance[channel]).toHaveProperty('deliveryRate');
                    expect(performance[channel]).toHaveProperty('readRate');
                    expect(performance[channel]).toHaveProperty('failureRate');
                }
            });
        });
    });

    describe('getHourlyDistribution', () => {
        it('should get hourly distribution of notifications', async () => {
            const distribution = await analyticsService.getHourlyDistribution();

            expect(distribution).toBeDefined();
            expect(typeof distribution).toBe('object');

            // Check if all 24 hours are represented
            for (let hour = 0; hour < 24; hour++) {
                if (distribution[hour]) {
                    expect(distribution[hour]).toHaveProperty('sent');
                    expect(distribution[hour]).toHaveProperty('read');
                    expect(typeof distribution[hour].sent).toBe('number');
                    expect(typeof distribution[hour].read).toBe('number');
                }
            }
        });
    });

    describe('generateAnalyticsReport', () => {
        it('should generate comprehensive analytics report', async () => {
            const startDate = new Date('2024-01-01');
            const endDate = new Date('2024-01-31');

            const report = await analyticsService.generateAnalyticsReport(startDate, endDate);

            expect(report).toBeDefined();
            expect(report).toHaveProperty('period');
            expect(report).toHaveProperty('overview');
            expect(report).toHaveProperty('channelPerformance');
            expect(report).toHaveProperty('topPerformingTypes');
            expect(report).toHaveProperty('hourlyDistribution');
            expect(report).toHaveProperty('generatedAt');

            expect(report.period.start).toBe(startDate.toISOString());
            expect(report.period.end).toBe(endDate.toISOString());
            expect(typeof report.period.days).toBe('number');
        });

        it('should generate report with user breakdown when requested', async () => {
            const startDate = new Date('2024-01-01');
            const endDate = new Date('2024-01-31');
            const includeUserBreakdown = true;

            const report = await analyticsService.generateAnalyticsReport(
                startDate,
                endDate,
                includeUserBreakdown
            );

            expect(report).toBeDefined();
            expect(report).toHaveProperty('userBreakdown');
            expect(report.userBreakdown).toHaveProperty('totalUsers');
            expect(report.userBreakdown).toHaveProperty('activeUsers');
        });
    });

    describe('cleanup operations', () => {
        it('should cleanup old analytics data', async () => {
            const daysToKeep = 30;

            const deletedCount = await analyticsService.cleanupOldAnalytics(daysToKeep);

            expect(typeof deletedCount).toBe('number');
            expect(deletedCount).toBeGreaterThanOrEqual(0);
        });

        it('should cleanup old analytics with default retention period', async () => {
            const deletedCount = await analyticsService.cleanupOldAnalytics();

            expect(typeof deletedCount).toBe('number');
            expect(deletedCount).toBeGreaterThanOrEqual(0);
        });
    });
});