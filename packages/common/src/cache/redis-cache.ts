import { createClient, RedisClientType } from 'redis';
import { logger } from '../logger';

export interface CacheConfig {
    host: string;
    port: number;
    password?: string;
    db?: number;
    keyPrefix?: string;
    defaultTTL?: number;
}

export interface CacheOptions {
    ttl?: number;
    tags?: string[];
}

export class RedisCache {
    private client: RedisClientType;
    private config: CacheConfig;
    private isConnected = false;

    constructor(config: CacheConfig) {
        this.config = {
            defaultTTL: 3600, // 1 hour default
            keyPrefix: 'ai-platform:',
            ...config,
        };

        this.client = createClient({
            socket: {
                host: this.config.host,
                port: this.config.port,
            },
            password: this.config.password,
            database: this.config.db || 0,
        });

        this.setupEventHandlers();
    }

    private setupEventHandlers(): void {
        this.client.on('connect', () => {
            logger.info('Redis client connected');
            this.isConnected = true;
        });

        this.client.on('error', (err) => {
            logger.error('Redis client error:', err);
            this.isConnected = false;
        });

        this.client.on('end', () => {
            logger.info('Redis client disconnected');
            this.isConnected = false;
        });
    }

    async connect(): Promise<void> {
        if (!this.isConnected) {
            await this.client.connect();
        }
    }

    async disconnect(): Promise<void> {
        if (this.isConnected) {
            await this.client.disconnect();
        }
    }

    private getKey(key: string): string {
        return `${this.config.keyPrefix}${key}`;
    }

    async get<T>(key: string): Promise<T | null> {
        try {
            const value = await this.client.get(this.getKey(key));
            return value ? JSON.parse(value) : null;
        } catch (error) {
            logger.error(`Cache get error for key ${key}:`, error);
            return null;
        }
    }

    async set<T>(key: string, value: T, options?: CacheOptions): Promise<boolean> {
        try {
            const serializedValue = JSON.stringify(value);
            const ttl = options?.ttl || this.config.defaultTTL!;

            await this.client.setEx(this.getKey(key), ttl, serializedValue);

            // Store tags for cache invalidation
            if (options?.tags) {
                await this.addToTags(key, options.tags);
            }

            return true;
        } catch (error) {
            logger.error(`Cache set error for key ${key}:`, error);
            return false;
        }
    }

    async del(key: string): Promise<boolean> {
        try {
            const result = await this.client.del(this.getKey(key));
            return result > 0;
        } catch (error) {
            logger.error(`Cache delete error for key ${key}:`, error);
            return false;
        }
    }

    async exists(key: string): Promise<boolean> {
        try {
            const result = await this.client.exists(this.getKey(key));
            return result > 0;
        } catch (error) {
            logger.error(`Cache exists error for key ${key}:`, error);
            return false;
        }
    }

    async invalidateByTag(tag: string): Promise<number> {
        try {
            const tagKey = this.getTagKey(tag);
            const keys = await this.client.sMembers(tagKey);

            if (keys.length === 0) return 0;

            // Delete all keys associated with the tag
            const pipeline = this.client.multi();
            keys.forEach(key => pipeline.del(this.getKey(key)));
            pipeline.del(tagKey);

            const results = await pipeline.exec();
            return keys.length;
        } catch (error) {
            logger.error(`Cache invalidate by tag error for tag ${tag}:`, error);
            return 0;
        }
    }

    async invalidateByPattern(pattern: string): Promise<number> {
        try {
            const keys = await this.client.keys(this.getKey(pattern));
            if (keys.length === 0) return 0;

            const result = await this.client.del(keys);
            return result;
        } catch (error) {
            logger.error(`Cache invalidate by pattern error for pattern ${pattern}:`, error);
            return 0;
        }
    }

    private getTagKey(tag: string): string {
        return `${this.config.keyPrefix}tags:${tag}`;
    }

    private async addToTags(key: string, tags: string[]): Promise<void> {
        const pipeline = this.client.multi();
        tags.forEach(tag => {
            pipeline.sAdd(this.getTagKey(tag), key);
        });
        await pipeline.exec();
    }

    async increment(key: string, value = 1): Promise<number> {
        try {
            return await this.client.incrBy(this.getKey(key), value);
        } catch (error) {
            logger.error(`Cache increment error for key ${key}:`, error);
            throw error;
        }
    }

    async expire(key: string, ttl: number): Promise<boolean> {
        try {
            const result = await this.client.expire(this.getKey(key), ttl);
            return result;
        } catch (error) {
            logger.error(`Cache expire error for key ${key}:`, error);
            return false;
        }
    }

    async getStats(): Promise<any> {
        try {
            const info = await this.client.info('memory');
            const keyspace = await this.client.info('keyspace');
            return { memory: info, keyspace };
        } catch (error) {
            logger.error('Cache stats error:', error);
            return null;
        }
    }
}