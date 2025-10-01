import { RedisCache } from '../cache/redis-cache';
import { CacheManager } from '../cache/cache-manager';
import { CacheMiddleware } from '../middleware/cache-middleware';

// Mock Redis client
const mockRedisClient = {
    connect: jest.fn(),
    disconnect: jest.fn(),
    get: jest.fn(),
    setEx: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    sMembers: jest.fn(),
    sAdd: jest.fn(),
    multi: jest.fn(() => ({
        del: jest.fn().mockReturnThis(),
        exec: jest.fn(),
    })),
    incrBy: jest.fn(),
    expire: jest.fn(),
    info: jest.fn(),
    keys: jest.fn(),
    on: jest.fn(),
};

jest.mock('redis', () => ({
    createClient: jest.fn(() => mockRedisClient),
}));

describe('RedisCache', () => {
    let cache: RedisCache;

    beforeEach(() => {
        jest.clearAllMocks();
        cache = new RedisCache({
            host: 'localhost',
            port: 6379,
            keyPrefix: 'test:',
        });
    });

    describe('get', () => {
        it('should return parsed value when key exists', async () => {
            const testData = { id: 1, name: 'test' };
            mockRedisClient.get.mockResolvedValue(JSON.stringify(testData));

            const result = await cache.get('test-key');

            expect(result).toEqual(testData);
            expect(mockRedisClient.get).toHaveBeenCalledWith('test:test-key');
        });

        it('should return null when key does not exist', async () => {
            mockRedisClient.get.mockResolvedValue(null);

            const result = await cache.get('nonexistent-key');

            expect(result).toBeNull();
        });

        it('should return null on error', async () => {
            mockRedisClient.get.mockRejectedValue(new Error('Redis error'));

            const result = await cache.get('error-key');

            expect(result).toBeNull();
        });
    });

    describe('set', () => {
        it('should set value with default TTL', async () => {
            const testData = { id: 1, name: 'test' };
            mockRedisClient.setEx.mockResolvedValue('OK');

            const result = await cache.set('test-key', testData);

            expect(result).toBe(true);
            expect(mockRedisClient.setEx).toHaveBeenCalledWith(
                'test:test-key',
                3600,
                JSON.stringify(testData)
            );
        });

        it('should set value with custom TTL', async () => {
            const testData = { id: 1, name: 'test' };
            mockRedisClient.setEx.mockResolvedValue('OK');

            const result = await cache.set('test-key', testData, { ttl: 1800 });

            expect(result).toBe(true);
            expect(mockRedisClient.setEx).toHaveBeenCalledWith(
                'test:test-key',
                1800,
                JSON.stringify(testData)
            );
        });

        it('should handle tags for cache invalidation', async () => {
            const testData = { id: 1, name: 'test' };
            mockRedisClient.setEx.mockResolvedValue('OK');
            mockRedisClient.multi().exec.mockResolvedValue([]);

            const result = await cache.set('test-key', testData, {
                ttl: 1800,
                tags: ['user', 'profile']
            });

            expect(result).toBe(true);
            expect(mockRedisClient.sAdd).toHaveBeenCalledTimes(2);
        });
    });

    describe('invalidateByTag', () => {
        it('should invalidate all keys with specified tag', async () => {
            mockRedisClient.sMembers.mockResolvedValue(['key1', 'key2']);
            mockRedisClient.multi().exec.mockResolvedValue([1, 1, 1]);

            const result = await cache.invalidateByTag('user');

            expect(result).toBe(2);
            expect(mockRedisClient.sMembers).toHaveBeenCalledWith('test:tags:user');
        });

        it('should return 0 when no keys found for tag', async () => {
            mockRedisClient.sMembers.mockResolvedValue([]);

            const result = await cache.invalidateByTag('nonexistent');

            expect(result).toBe(0);
        });
    });
});

describe('CacheManager', () => {
    let cacheManager: CacheManager;
    let mockCache: jest.Mocked<RedisCache>;

    beforeEach(() => {
        mockCache = {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
            exists: jest.fn(),
            invalidateByTag: jest.fn(),
            invalidateByPattern: jest.fn(),
            getStats: jest.fn(),
        } as any;

        cacheManager = new CacheManager(mockCache);
    });

    describe('getOrSet', () => {
        it('should return cached value if exists', async () => {
            const cachedData = { id: 1, name: 'cached' };
            mockCache.get.mockResolvedValue(cachedData);

            const fetcher = jest.fn();
            const result = await cacheManager.getOrSet('test-key', fetcher);

            expect(result).toEqual(cachedData);
            expect(fetcher).not.toHaveBeenCalled();
            expect(mockCache.get).toHaveBeenCalledWith('test-key');
        });

        it('should fetch and cache value if not exists', async () => {
            const fetchedData = { id: 1, name: 'fetched' };
            mockCache.get.mockResolvedValue(null);
            mockCache.set.mockResolvedValue(true);

            const fetcher = jest.fn().mockResolvedValue(fetchedData);
            const result = await cacheManager.getOrSet('test-key', fetcher);

            expect(result).toEqual(fetchedData);
            expect(fetcher).toHaveBeenCalled();
            expect(mockCache.set).toHaveBeenCalledWith('test-key', fetchedData, { ttl: 3600 });
        });

        it('should throw error if fetcher fails', async () => {
            mockCache.get.mockResolvedValue(null);
            const error = new Error('Fetch failed');
            const fetcher = jest.fn().mockRejectedValue(error);

            await expect(cacheManager.getOrSet('test-key', fetcher)).rejects.toThrow('Fetch failed');
        });
    });

    describe('specialized methods', () => {
        it('should cache user data with user strategy', async () => {
            const userData = { id: '123', name: 'John' };
            mockCache.set.mockResolvedValue(true);

            const result = await cacheManager.cacheUser('123', userData);

            expect(result).toBe(true);
            expect(mockCache.set).toHaveBeenCalledWith('user:123', userData, 'user');
        });

        it('should get user data', async () => {
            const userData = { id: '123', name: 'John' };
            mockCache.get.mockResolvedValue(userData);

            const result = await cacheManager.getUser('123');

            expect(result).toEqual(userData);
            expect(mockCache.get).toHaveBeenCalledWith('user:123', 'user');
        });
    });

    describe('batch operations', () => {
        it('should get multiple keys', async () => {
            mockCache.get
                .mockResolvedValueOnce({ id: 1 })
                .mockResolvedValueOnce({ id: 2 })
                .mockResolvedValueOnce(null);

            const result = await cacheManager.mget(['key1', 'key2', 'key3']);

            expect(result).toEqual([{ id: 1 }, { id: 2 }, null]);
        });

        it('should set multiple keys', async () => {
            mockCache.set.mockResolvedValue(true);

            const items = [
                { key: 'key1', value: { id: 1 } },
                { key: 'key2', value: { id: 2 }, strategy: 'user' },
            ];

            const result = await cacheManager.mset(items);

            expect(result).toEqual([true, true]);
            expect(mockCache.set).toHaveBeenCalledTimes(2);
        });
    });

    describe('healthCheck', () => {
        it('should return true when cache is healthy', async () => {
            mockCache.set.mockResolvedValue(true);
            mockCache.get.mockResolvedValue({ timestamp: expect.any(Number) });
            mockCache.del.mockResolvedValue(true);

            const result = await cacheManager.healthCheck();

            expect(result).toBe(true);
        });

        it('should return false when cache is unhealthy', async () => {
            mockCache.set.mockRejectedValue(new Error('Cache error'));

            const result = await cacheManager.healthCheck();

            expect(result).toBe(false);
        });
    });
});

describe('CacheMiddleware', () => {
    let cacheMiddleware: CacheMiddleware;
    let mockCacheManager: jest.Mocked<CacheManager>;
    let mockReq: any;
    let mockRes: any;
    let mockNext: jest.Mock;

    beforeEach(() => {
        mockCacheManager = {
            get: jest.fn(),
            set: jest.fn(),
            invalidateByPattern: jest.fn(),
            invalidateByTag: jest.fn(),
        } as any;

        cacheMiddleware = new CacheMiddleware(mockCacheManager);

        mockReq = {
            method: 'GET',
            path: '/api/problems',
            query: {},
            user: { id: '123' },
        };

        mockRes = {
            json: jest.fn(),
            set: jest.fn(),
            statusCode: 200,
        };

        mockNext = jest.fn();
    });

    it('should skip caching for non-GET requests', async () => {
        mockReq.method = 'POST';

        const middleware = cacheMiddleware.cache();
        await middleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalled();
        expect(mockCacheManager.get).not.toHaveBeenCalled();
    });

    it('should return cached response if exists', async () => {
        const cachedData = { data: 'cached' };
        mockCacheManager.get.mockResolvedValue(cachedData);

        const middleware = cacheMiddleware.cache();
        await middleware(mockReq, mockRes, mockNext);

        expect(mockRes.json).toHaveBeenCalledWith(cachedData);
        expect(mockRes.set).toHaveBeenCalledWith('X-Cache', 'HIT');
        expect(mockNext).not.toHaveBeenCalled();
    });

    it('should proceed to next middleware if cache miss', async () => {
        mockCacheManager.get.mockResolvedValue(null);

        const middleware = cacheMiddleware.cache();
        await middleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalled();
        expect(mockRes.set).toHaveBeenCalledWith('X-Cache', 'MISS');
    });

    it('should generate correct cache key', async () => {
        mockReq.query = { page: '1', limit: '20' };
        mockCacheManager.get.mockResolvedValue(null);

        const middleware = cacheMiddleware.cache();
        await middleware(mockReq, mockRes, mockNext);

        expect(mockCacheManager.get).toHaveBeenCalledWith(
            expect.stringContaining('api:GET:/api/problems?limit=20&page=1|user:123')
        );
    });

    describe('predefined strategies', () => {
        it('should create user profile cache middleware', async () => {
            mockReq.params = { userId: '456' };
            mockCacheManager.get.mockResolvedValue(null);

            const middleware = CacheMiddleware.userProfile(mockCacheManager);
            await middleware(mockReq, mockRes, mockNext);

            expect(mockCacheManager.get).toHaveBeenCalledWith('user:profile:456');
        });

        it('should create problem list cache middleware', async () => {
            mockReq.query = { page: '2', difficulty: 'medium' };
            mockCacheManager.get.mockResolvedValue(null);

            const middleware = CacheMiddleware.problemList(mockCacheManager);
            await middleware(mockReq, mockRes, mockNext);

            expect(mockCacheManager.get).toHaveBeenCalledWith(
                'problems:list:page:2:limit:20:difficulty:medium:tags:all'
            );
        });
    });
});