import { RedisCache, CacheOptions } from './redis-cache';
import { logger } from '../logger';

export interface CacheStrategy {
    name: string;
    ttl: number;
    tags?: string[];
}

export class CacheManager {
    private cache: RedisCache;
    private strategies: Map<string, CacheStrategy> = new Map();

    constructor(cache: RedisCache) {
        this.cache = cache;
        this.setupDefaultStrategies();
    }

    private setupDefaultStrategies(): void {
        // User data - medium TTL, user-specific tags
        this.strategies.set('user', {
            name: 'user',
            ttl: 1800, // 30 minutes
            tags: ['user-data'],
        });

        // Problem data - long TTL, problem-specific tags
        this.strategies.set('problem', {
            name: 'problem',
            ttl: 3600, // 1 hour
            tags: ['problem-data'],
        });

        // Contest data - short TTL during active contests
        this.strategies.set('contest', {
            name: 'contest',
            ttl: 300, // 5 minutes
            tags: ['contest-data'],
        });

        // Leaderboard - very short TTL for real-time updates
        this.strategies.set('leaderboard', {
            name: 'leaderboard',
            ttl: 60, // 1 minute
            tags: ['leaderboard'],
        });

        // Analytics - longer TTL for computed data
        this.strategies.set('analytics', {
            name: 'analytics',
            ttl: 7200, // 2 hours
            tags: ['analytics'],
        });

        // Session data - medium TTL
        this.strategies.set('session', {
            name: 'session',
            ttl: 3600, // 1 hour
            tags: ['session'],
        });
    }

    async get<T>(key: string, strategy?: string): Promise<T | null> {
        return this.cache.get<T>(key);
    }

    async set<T>(key: string, value: T, strategy = 'default'): Promise<boolean> {
        const cacheStrategy = this.strategies.get(strategy);
        const options: CacheOptions = cacheStrategy
            ? { ttl: cacheStrategy.ttl, tags: cacheStrategy.tags }
            : { ttl: 3600 };

        return this.cache.set(key, value, options);
    }

    async getOrSet<T>(
        key: string,
        fetcher: () => Promise<T>,
        strategy = 'default'
    ): Promise<T> {
        // Try to get from cache first
        const cached = await this.get<T>(key, strategy);
        if (cached !== null) {
            return cached;
        }

        // If not in cache, fetch and store
        try {
            const value = await fetcher();
            await this.set(key, value, strategy);
            return value;
        } catch (error) {
            logger.error(`Error in getOrSet for key ${key}:`, error);
            throw error;
        }
    }

    async invalidate(key: string): Promise<boolean> {
        return this.cache.del(key);
    }

    async invalidateByTag(tag: string): Promise<number> {
        return this.cache.invalidateByTag(tag);
    }

    async invalidateByPattern(pattern: string): Promise<number> {
        return this.cache.invalidateByPattern(pattern);
    }

    // Specialized methods for common use cases
    async cacheUser(userId: string, userData: any): Promise<boolean> {
        return this.set(`user:${userId}`, userData, 'user');
    }

    async getUser(userId: string): Promise<any | null> {
        return this.get(`user:${userId}`, 'user');
    }

    async cacheProblem(problemId: string, problemData: any): Promise<boolean> {
        return this.set(`problem:${problemId}`, problemData, 'problem');
    }

    async getProblem(problemId: string): Promise<any | null> {
        return this.get(`problem:${problemId}`, 'problem');
    }

    async cacheLeaderboard(contestId: string, leaderboard: any): Promise<boolean> {
        return this.set(`leaderboard:${contestId}`, leaderboard, 'leaderboard');
    }

    async getLeaderboard(contestId: string): Promise<any | null> {
        return this.get(`leaderboard:${contestId}`, 'leaderboard');
    }

    async cacheSession(sessionId: string, sessionData: any): Promise<boolean> {
        return this.set(`session:${sessionId}`, sessionData, 'session');
    }

    async getSession(sessionId: string): Promise<any | null> {
        return this.get(`session:${sessionId}`, 'session');
    }

    // Batch operations
    async mget<T>(keys: string[]): Promise<(T | null)[]> {
        const promises = keys.map(key => this.get<T>(key));
        return Promise.all(promises);
    }

    async mset<T>(items: Array<{ key: string; value: T; strategy?: string }>): Promise<boolean[]> {
        const promises = items.map(item =>
            this.set(item.key, item.value, item.strategy)
        );
        return Promise.all(promises);
    }

    // Cache warming
    async warmCache(warmers: Array<{ key: string; fetcher: () => Promise<any>; strategy?: string }>): Promise<void> {
        const promises = warmers.map(async warmer => {
            try {
                const exists = await this.cache.exists(warmer.key);
                if (!exists) {
                    const value = await warmer.fetcher();
                    await this.set(warmer.key, value, warmer.strategy);
                }
            } catch (error) {
                logger.error(`Cache warming failed for key ${warmer.key}:`, error);
            }
        });

        await Promise.all(promises);
    }

    // Cache statistics
    async getStats(): Promise<any> {
        return this.cache.getStats();
    }

    // Health check
    async healthCheck(): Promise<boolean> {
        try {
            const testKey = 'health-check';
            const testValue = { timestamp: Date.now() };

            await this.cache.set(testKey, testValue, { ttl: 10 });
            const retrieved = await this.cache.get(testKey);
            await this.cache.del(testKey);

            return retrieved !== null;
        } catch (error) {
            logger.error('Cache health check failed:', error);
            return false;
        }
    }
}