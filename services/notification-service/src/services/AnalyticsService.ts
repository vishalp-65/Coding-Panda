import { v4 as uuidv4 } from 'uuid';
import { RedisManager } from '../config/redis';
import { NotificationAnalytics, NotificationChannel, NotificationStats, NotificationType } from '../types';

export class AnalyticsService {
    private static instance: AnalyticsService;
    private redis: RedisManager;

    private constructor() {
        this.redis = RedisManager.getInstance();
    }

    public static getInstance(): AnalyticsService {
        if (!AnalyticsService.instance) {
            AnalyticsService.instance = new AnalyticsService();
        }
        return AnalyticsService.instance;
    }

    public async trackNotificationEvent(
        notificationId: string,
        userId: string,
        event: 'sent' | 'delivered' | 'read' | 'clicked' | 'failed',
        channel: NotificationChannel,
        metadata?: Record<string, any>
    ): Promise<void> {
        const analytics: NotificationAnalytics = {
            id: uuidv4(),
            notificationId,
            userId,
            event,
            channel,
            timestamp: new Date(),
            metadata
        };

        try {
            await this.redis.storeAnalytics(analytics);

            // Update real-time counters
            await this.updateCounters(event, channel, userId);

            console.log(`Tracked notification event: ${event} for notification ${notificationId}`);
        } catch (error) {
            console.error('Error tracking notification event:', error);
        }
    }

    private async updateCounters(
        event: string,
        channel: NotificationChannel,
        userId: string
    ): Promise<void> {
        const today = new Date().toISOString().split('T')[0];
        const client = this.redis.getClient();

        // Daily counters
        await Promise.all([
            client.incr(`analytics:daily:${today}:${event}`),
            client.incr(`analytics:daily:${today}:${channel}:${event}`),
            client.incr(`analytics:user:${userId}:${event}`),
            client.expire(`analytics:daily:${today}:${event}`, 86400 * 30), // 30 days TTL
            client.expire(`analytics:daily:${today}:${channel}:${event}`, 86400 * 30),
            client.expire(`analytics:user:${userId}:${event}`, 86400 * 90) // 90 days TTL
        ]);

        // Weekly counters
        const weekStart = this.getWeekStart(new Date()).toISOString().split('T')[0];
        await Promise.all([
            client.incr(`analytics:weekly:${weekStart}:${event}`),
            client.incr(`analytics:weekly:${weekStart}:${channel}:${event}`),
            client.expire(`analytics:weekly:${weekStart}:${event}`, 86400 * 90),
            client.expire(`analytics:weekly:${weekStart}:${channel}:${event}`, 86400 * 90)
        ]);

        // Monthly counters
        const monthStart = new Date().toISOString().substring(0, 7); // YYYY-MM
        await Promise.all([
            client.incr(`analytics:monthly:${monthStart}:${event}`),
            client.incr(`analytics:monthly:${monthStart}:${channel}:${event}`),
            client.expire(`analytics:monthly:${monthStart}:${event}`, 86400 * 365),
            client.expire(`analytics:monthly:${monthStart}:${channel}:${event}`, 86400 * 365)
        ]);
    }

    public async getNotificationStats(
        startDate?: Date,
        endDate?: Date,
        userId?: string
    ): Promise<NotificationStats> {
        const client = this.redis.getClient();
        const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
        const end = endDate || new Date();

        try {
            // Get daily stats for the period
            const stats: NotificationStats = {
                totalSent: 0,
                totalDelivered: 0,
                totalRead: 0,
                totalFailed: 0,
                deliveryRate: 0,
                readRate: 0,
                byType: {} as any,
                byChannel: {} as any
            };

            // Initialize type and channel stats
            Object.values(NotificationType).forEach(type => {
                stats.byType[type] = { sent: 0, delivered: 0, read: 0, failed: 0 };
            });

            Object.values(NotificationChannel).forEach(channel => {
                stats.byChannel[channel] = { sent: 0, delivered: 0, read: 0, failed: 0 };
            });

            // Aggregate stats for each day in the period
            const currentDate = new Date(start);
            while (currentDate <= end) {
                const dateStr = currentDate.toISOString().split('T')[0];

                const prefix = userId ? `analytics:user:${userId}` : `analytics:daily:${dateStr}`;

                const [sent, delivered, read, failed] = await Promise.all([
                    client.get(`${prefix}:sent`).then(val => parseInt(val || '0')),
                    client.get(`${prefix}:delivered`).then(val => parseInt(val || '0')),
                    client.get(`${prefix}:read`).then(val => parseInt(val || '0')),
                    client.get(`${prefix}:failed`).then(val => parseInt(val || '0'))
                ]);

                stats.totalSent += sent;
                stats.totalDelivered += delivered;
                stats.totalRead += read;
                stats.totalFailed += failed;

                // Get channel-specific stats
                for (const channel of Object.values(NotificationChannel)) {
                    const [channelSent, channelDelivered, channelRead, channelFailed] = await Promise.all([
                        client.get(`${prefix}:${channel}:sent`).then(val => parseInt(val || '0')),
                        client.get(`${prefix}:${channel}:delivered`).then(val => parseInt(val || '0')),
                        client.get(`${prefix}:${channel}:read`).then(val => parseInt(val || '0')),
                        client.get(`${prefix}:${channel}:failed`).then(val => parseInt(val || '0'))
                    ]);

                    stats.byChannel[channel].sent += channelSent;
                    stats.byChannel[channel].delivered += channelDelivered;
                    stats.byChannel[channel].read += channelRead;
                    stats.byChannel[channel].failed += channelFailed;
                }

                currentDate.setDate(currentDate.getDate() + 1);
            }

            // Calculate rates
            stats.deliveryRate = stats.totalSent > 0 ? (stats.totalDelivered / stats.totalSent) * 100 : 0;
            stats.readRate = stats.totalDelivered > 0 ? (stats.totalRead / stats.totalDelivered) * 100 : 0;

            return stats;
        } catch (error) {
            console.error('Error getting notification stats:', error);
            throw error;
        }
    }

    public async getUserEngagementStats(userId: string, days = 30): Promise<any> {
        const client = this.redis.getClient();
        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

        try {
            const stats = {
                totalNotifications: 0,
                readNotifications: 0,
                clickedNotifications: 0,
                readRate: 0,
                clickRate: 0,
                averageReadTime: 0,
                preferredChannel: NotificationChannel.IN_APP,
                mostEngagedTypes: [] as string[],
                dailyActivity: [] as any[]
            };

            // Get user-specific counters
            const [sent, read, clicked] = await Promise.all([
                client.get(`analytics:user:${userId}:sent`).then(val => parseInt(val || '0')),
                client.get(`analytics:user:${userId}:read`).then(val => parseInt(val || '0')),
                client.get(`analytics:user:${userId}:clicked`).then(val => parseInt(val || '0'))
            ]);

            stats.totalNotifications = sent;
            stats.readNotifications = read;
            stats.clickedNotifications = clicked;
            stats.readRate = sent > 0 ? (read / sent) * 100 : 0;
            stats.clickRate = read > 0 ? (clicked / read) * 100 : 0;

            // Get daily activity for the period
            const currentDate = new Date(startDate);
            while (currentDate <= endDate) {
                const dateStr = currentDate.toISOString().split('T')[0];

                const dailySent = await client.get(`analytics:user:${userId}:daily:${dateStr}:sent`);
                const dailyRead = await client.get(`analytics:user:${userId}:daily:${dateStr}:read`);

                stats.dailyActivity.push({
                    date: dateStr,
                    sent: parseInt(dailySent || '0'),
                    read: parseInt(dailyRead || '0')
                });

                currentDate.setDate(currentDate.getDate() + 1);
            }

            return stats;
        } catch (error) {
            console.error('Error getting user engagement stats:', error);
            throw error;
        }
    }

    public async getTopPerformingNotificationTypes(limit = 10): Promise<any[]> {
        const client = this.redis.getClient();

        try {
            const typeStats = [];

            for (const type of Object.values(NotificationType)) {
                const [sent, read] = await Promise.all([
                    client.get(`analytics:type:${type}:sent`).then(val => parseInt(val || '0')),
                    client.get(`analytics:type:${type}:read`).then(val => parseInt(val || '0'))
                ]);

                if (sent > 0) {
                    typeStats.push({
                        type,
                        sent,
                        read,
                        readRate: (read / sent) * 100
                    });
                }
            }

            return typeStats
                .sort((a, b) => b.readRate - a.readRate)
                .slice(0, limit);
        } catch (error) {
            console.error('Error getting top performing notification types:', error);
            return [];
        }
    }

    public async getChannelPerformance(): Promise<any> {
        const client = this.redis.getClient();

        try {
            const channelStats: any = {};

            for (const channel of Object.values(NotificationChannel)) {
                const [sent, delivered, read, failed] = await Promise.all([
                    client.get(`analytics:channel:${channel}:sent`).then(val => parseInt(val || '0')),
                    client.get(`analytics:channel:${channel}:delivered`).then(val => parseInt(val || '0')),
                    client.get(`analytics:channel:${channel}:read`).then(val => parseInt(val || '0')),
                    client.get(`analytics:channel:${channel}:failed`).then(val => parseInt(val || '0'))
                ]);

                channelStats[channel] = {
                    sent,
                    delivered,
                    read,
                    failed,
                    deliveryRate: sent > 0 ? (delivered / sent) * 100 : 0,
                    readRate: delivered > 0 ? (read / delivered) * 100 : 0,
                    failureRate: sent > 0 ? (failed / sent) * 100 : 0
                };
            }

            return channelStats;
        } catch (error) {
            console.error('Error getting channel performance:', error);
            return {};
        }
    }

    public async getHourlyDistribution(): Promise<any> {
        const client = this.redis.getClient();

        try {
            const hourlyStats: any = {};

            for (let hour = 0; hour < 24; hour++) {
                const sent = await client.get(`analytics:hourly:${hour}:sent`);
                const read = await client.get(`analytics:hourly:${hour}:read`);

                hourlyStats[hour] = {
                    sent: parseInt(sent || '0'),
                    read: parseInt(read || '0')
                };
            }

            return hourlyStats;
        } catch (error) {
            console.error('Error getting hourly distribution:', error);
            return {};
        }
    }

    public async generateAnalyticsReport(
        startDate: Date,
        endDate: Date,
        includeUserBreakdown = false
    ): Promise<any> {
        try {
            const [
                overallStats,
                channelPerformance,
                topTypes,
                hourlyDistribution
            ] = await Promise.all([
                this.getNotificationStats(startDate, endDate),
                this.getChannelPerformance(),
                this.getTopPerformingNotificationTypes(),
                this.getHourlyDistribution()
            ]);

            const report: any = {
                period: {
                    start: startDate.toISOString(),
                    end: endDate.toISOString(),
                    days: Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
                },
                overview: overallStats,
                channelPerformance,
                topPerformingTypes: topTypes,
                hourlyDistribution,
                generatedAt: new Date().toISOString()
            };

            if (includeUserBreakdown) {
                // This would include user-specific analytics
                report.userBreakdown = await this.getUserBreakdownStats(startDate, endDate);
            }

            return report;
        } catch (error) {
            console.error('Error generating analytics report:', error);
            throw error;
        }
    }

    private async getUserBreakdownStats(startDate: Date, endDate: Date): Promise<any> {
        // This would analyze user-specific stats
        // For now, return placeholder
        return {
            totalUsers: 0,
            activeUsers: 0,
            topEngagedUsers: [],
            averageNotificationsPerUser: 0
        };
    }

    private getWeekStart(date: Date): Date {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
        return new Date(d.setDate(diff));
    }

    // Cleanup methods
    public async cleanupOldAnalytics(daysToKeep = 90): Promise<number> {
        const client = this.redis.getClient();
        const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

        try {
            const keys = await client.keys('analytics:*');
            let deletedCount = 0;

            for (const key of keys) {
                // Extract date from key if possible and check if it's older than cutoff
                const dateMatch = key.match(/(\d{4}-\d{2}-\d{2})/);
                if (dateMatch) {
                    const keyDate = new Date(dateMatch[1]);
                    if (keyDate < cutoffDate) {
                        await client.del(key);
                        deletedCount++;
                    }
                }
            }

            console.log(`Cleaned up ${deletedCount} old analytics keys`);
            return deletedCount;
        } catch (error) {
            console.error('Error cleaning up old analytics:', error);
            return 0;
        }
    }
}