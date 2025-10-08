import * as Redis from 'redis';
import { NotificationData, NotificationAnalytics } from '../types';

export class RedisManager {
    private static instance: RedisManager;
    private client: Redis.RedisClientType;
    private subscriber: Redis.RedisClientType;
    private publisher: Redis.RedisClientType;

    private constructor() {
        const redisConfig = {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
            password: process.env.REDIS_PASSWORD || undefined,
            retryDelayOnFailover: 100,
            maxRetriesPerRequest: 3,
        };

        this.client = Redis.createClient(redisConfig);
        this.subscriber = Redis.createClient(redisConfig);
        this.publisher = Redis.createClient(redisConfig);

        this.client.on('error', (err) => console.error('Redis Client Error:', err));
        this.subscriber.on('error', (err) => console.error('Redis Subscriber Error:', err));
        this.publisher.on('error', (err) => console.error('Redis Publisher Error:', err));
    }

    public static getInstance(): RedisManager {
        if (!RedisManager.instance) {
            RedisManager.instance = new RedisManager();
        }
        return RedisManager.instance;
    }

    public async connect(): Promise<void> {
        await Promise.all([
            this.client.connect(),
            this.subscriber.connect(),
            this.publisher.connect()
        ]);
        console.log('Redis connections established');
    }

    public async disconnect(): Promise<void> {
        await Promise.all([
            this.client.disconnect(),
            this.subscriber.disconnect(),
            this.publisher.disconnect()
        ]);
        console.log('Redis connections closed');
    }

    public getClient(): Redis.RedisClientType {
        return this.client;
    }

    public getSubscriber(): Redis.RedisClientType {
        return this.subscriber;
    }

    public getPublisher(): Redis.RedisClientType {
        return this.publisher;
    }

    // Notification storage methods
    public async storeNotification(notification: NotificationData): Promise<void> {
        const key = `notification:${notification.id}`;
        const userKey = `user:${notification.userId}:notifications`;

        await Promise.all([
            this.client.hSet(key, {
                id: notification.id,
                userId: notification.userId,
                type: notification.type,
                channel: notification.channel,
                priority: notification.priority,
                title: notification.title,
                message: notification.message,
                data: JSON.stringify(notification.data || {}),
                read: notification.read.toString(),
                createdAt: notification.createdAt.toISOString(),
                readAt: notification.readAt?.toISOString() || '',
                expiresAt: notification.expiresAt?.toISOString() || '',
                templateId: notification.templateId || ''
            }),
            this.client.zAdd(userKey, {
                score: notification.createdAt.getTime(),
                value: notification.id
            }),
            // Set expiration if specified
            notification.expiresAt ? this.client.expireAt(key, Math.floor(notification.expiresAt.getTime() / 1000)) : Promise.resolve()
        ]);
    }

    public async getNotification(notificationId: string): Promise<NotificationData | null> {
        const key = `notification:${notificationId}`;
        const data = await this.client.hGetAll(key);

        if (!data.id) return null;

        return {
            id: data.id,
            userId: data.userId,
            type: data.type as any,
            channel: data.channel as any,
            priority: data.priority as any,
            title: data.title,
            message: data.message,
            data: data.data ? JSON.parse(data.data) : undefined,
            read: data.read === 'true',
            createdAt: new Date(data.createdAt),
            readAt: data.readAt ? new Date(data.readAt) : undefined,
            expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
            templateId: data.templateId || undefined
        };
    }

    public async getUserNotifications(userId: string, limit = 50, offset = 0): Promise<NotificationData[]> {
        const userKey = `user:${userId}:notifications`;
        const notificationIds = await this.client.zRange(userKey, offset, offset + limit - 1, { REV: true });

        if (notificationIds.length === 0) return [];

        const notifications: NotificationData[] = [];
        for (const id of notificationIds) {
            const notification = await this.getNotification(id);
            if (notification) {
                notifications.push(notification);
            }
        }

        return notifications;
    }

    public async markNotificationAsRead(notificationId: string, userId: string): Promise<void> {
        const key = `notification:${notificationId}`;
        const readAt = new Date().toISOString();

        await this.client.hSet(key, {
            read: 'true',
            readAt: readAt
        });
    }

    public async getUnreadCount(userId: string): Promise<number> {
        const userKey = `user:${userId}:notifications`;
        const notificationIds = await this.client.zRange(userKey, 0, -1, { REV: true });

        let unreadCount = 0;
        for (const id of notificationIds) {
            const notification = await this.getNotification(id);
            if (notification && !notification.read) {
                unreadCount++;
            }
        }

        return unreadCount;
    }

    // Analytics storage methods
    public async storeAnalytics(analytics: NotificationAnalytics): Promise<void> {
        const key = `analytics:${analytics.id}`;
        const timeKey = `analytics:${analytics.timestamp.toISOString().split('T')[0]}`;

        await Promise.all([
            this.client.hSet(key, {
                id: analytics.id,
                notificationId: analytics.notificationId,
                userId: analytics.userId,
                event: analytics.event,
                channel: analytics.channel,
                timestamp: analytics.timestamp.toISOString(),
                metadata: JSON.stringify(analytics.metadata || {})
            }),
            this.client.zAdd(timeKey, {
                score: analytics.timestamp.getTime(),
                value: analytics.id
            }),
            this.client.expire(timeKey, 86400 * 90) // Keep analytics for 90 days
        ]);
    }

    // Preference storage methods
    public async storeUserPreferences(userId: string, preferences: any): Promise<void> {
        const key = `user:${userId}:preferences`;
        await this.client.hSet(key, {
            preferences: JSON.stringify(preferences),
            updatedAt: new Date().toISOString()
        });
    }

    public async getUserPreferences(userId: string): Promise<any | null> {
        const key = `user:${userId}:preferences`;
        const data = await this.client.hGet(key, 'preferences');
        return data ? JSON.parse(data) : null;
    }

    // Queue management
    public async addToQueue(queueName: string, jobData: any, options?: any): Promise<void> {
        const key = `queue:${queueName}`;
        const job = {
            id: `${Date.now()}-${Math.random()}`,
            data: jobData,
            options: options || {},
            createdAt: new Date().toISOString()
        };

        await this.client.lPush(key, JSON.stringify(job));
    }

    public async getFromQueue(queueName: string): Promise<any | null> {
        const key = `queue:${queueName}`;
        const jobData = await this.client.brPop(key, 1);
        return jobData ? JSON.parse(jobData.element) : null;
    }

    // Cleanup methods
    public async cleanupExpiredNotifications(): Promise<number> {
        const pattern = 'notification:*';
        const keys = await this.client.keys(pattern);
        let cleanedCount = 0;

        for (const key of keys) {
            const expiresAt = await this.client.hGet(key, 'expiresAt');
            if (expiresAt && new Date(expiresAt) < new Date()) {
                await this.client.del(key);
                cleanedCount++;
            }
        }

        return cleanedCount;
    }
}