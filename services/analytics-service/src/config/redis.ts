import Redis from 'ioredis';

export const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: 3,
    lazyConnect: true,
});

export const initializeRedis = async (): Promise<void> => {
    try {
        await redis.connect();
        console.log('Redis connection established successfully');
    } catch (error) {
        console.error('Error connecting to Redis:', error);
        throw error;
    }
};