import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { redis } from '../config/redis';
import { AnalyticsEvent } from '../entities/AnalyticsEvent';
import { AnalyticsEvent as IAnalyticsEvent } from '../types';
import Queue from 'bull';

export class EventTrackingService {
    private eventRepository: Repository<AnalyticsEvent>;
    private eventQueue: Queue.Queue;

    constructor() {
        this.eventRepository = AppDataSource.getRepository(AnalyticsEvent);
        this.eventQueue = new Queue('event processing', {
            redis: {
                host: process.env.REDIS_HOST || 'localhost',
                port: parseInt(process.env.REDIS_PORT || '6379'),
            }
        });

        this.setupEventProcessor();
    }

    async trackEvent(eventData: Omit<IAnalyticsEvent, 'id' | 'timestamp'>): Promise<void> {
        try {
            // Add to queue for async processing
            await this.eventQueue.add('process-event', eventData, {
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 2000,
                },
                delay: 1000,
            });

            // Also cache recent events for real-time analytics
            const cacheKey = `recent_events:${eventData.userId}`;
            await redis.lpush(cacheKey, JSON.stringify({
                ...eventData,
                timestamp: new Date(),
            }));
            await redis.ltrim(cacheKey, 0, 99); // Keep last 100 events
            await redis.expire(cacheKey, 3600); // 1 hour TTL
        } catch (error) {
            console.error('Error tracking event:', error);
            throw error;
        }
    }

    async getRecentEvents(userId: string, limit: number = 50): Promise<IAnalyticsEvent[]> {
        try {
            const cacheKey = `recent_events:${userId}`;
            const cachedEvents = await redis.lrange(cacheKey, 0, limit - 1);

            if (cachedEvents.length > 0) {
                return cachedEvents.map(event => JSON.parse(event));
            }

            // Fallback to database
            const events = await this.eventRepository.find({
                where: { userId },
                order: { timestamp: 'DESC' },
                take: limit,
            });

            return events;
        } catch (error) {
            console.error('Error getting recent events:', error);
            throw error;
        }
    }

    async getEventsByType(eventType: string, startDate: Date, endDate: Date): Promise<IAnalyticsEvent[]> {
        try {
            return await this.eventRepository.find({
                where: {
                    eventType,
                    timestamp: {
                        $gte: startDate,
                        $lte: endDate,
                    } as any,
                },
                order: { timestamp: 'DESC' },
            });
        } catch (error) {
            console.error('Error getting events by type:', error);
            throw error;
        }
    }

    async getUserEventStats(userId: string, days: number = 30): Promise<Record<string, number>> {
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);

            const events = await this.eventRepository
                .createQueryBuilder('event')
                .select('event.eventType', 'eventType')
                .addSelect('COUNT(*)', 'count')
                .where('event.userId = :userId', { userId })
                .andWhere('event.timestamp >= :startDate', { startDate })
                .groupBy('event.eventType')
                .getRawMany();

            const stats: Record<string, number> = {};
            events.forEach(event => {
                stats[event.eventType] = parseInt(event.count);
            });

            return stats;
        } catch (error) {
            console.error('Error getting user event stats:', error);
            throw error;
        }
    }

    private setupEventProcessor(): void {
        this.eventQueue.process('process-event', async (job) => {
            const eventData = job.data;

            try {
                const event = this.eventRepository.create({
                    ...eventData,
                    timestamp: new Date(),
                });

                await this.eventRepository.save(event);

                // Trigger real-time analytics updates
                await this.updateRealTimeMetrics(eventData);

                return { success: true };
            } catch (error) {
                console.error('Error processing event:', error);
                throw error;
            }
        });
    }

    private async updateRealTimeMetrics(eventData: any): Promise<void> {
        try {
            const today = new Date().toISOString().split('T')[0];

            // Update daily active users
            await redis.sadd(`dau:${today}`, eventData.userId);
            await redis.expire(`dau:${today}`, 86400 * 7); // 7 days TTL

            // Update event counters
            await redis.incr(`events:${eventData.eventType}:${today}`);
            await redis.expire(`events:${eventData.eventType}:${today}`, 86400 * 30); // 30 days TTL

            // Update user session tracking
            if (eventData.sessionId) {
                await redis.set(`session:${eventData.sessionId}:last_activity`, Date.now(), 'EX', 3600);
            }
        } catch (error) {
            console.error('Error updating real-time metrics:', error);
        }
    }
}