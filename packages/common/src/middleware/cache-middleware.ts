import { Request, Response, NextFunction } from 'express';

// Extend Request interface to include user property
declare global {
    namespace Express {
        interface Request {
            user?: {
                id?: string;
                [key: string]: any;
            };
        }
    }
}
import { CacheManager } from '../cache/cache-manager';
import { logger } from '../logger';

export interface CacheMiddlewareOptions {
    ttl?: number;
    strategy?: string;
    keyGenerator?: (req: Request) => string;
    condition?: (req: Request, res: Response) => boolean;
    skipCache?: (req: Request) => boolean;
    varyBy?: string[];
}

export class CacheMiddleware {
    private cacheManager: CacheManager;

    constructor(cacheManager: CacheManager) {
        this.cacheManager = cacheManager;
    }

    cache(options: CacheMiddlewareOptions = {}) {
        return async (req: Request, res: Response, next: NextFunction) => {
            // Skip caching for non-GET requests by default
            if (req.method !== 'GET') {
                return next();
            }

            // Skip cache if condition is not met
            if (options.skipCache && options.skipCache(req)) {
                return next();
            }

            const cacheKey = this.generateCacheKey(req, options);

            try {
                // Try to get cached response
                const cachedResponse = await this.cacheManager.get(cacheKey);

                if (cachedResponse) {
                    logger.debug(`Cache hit for key: ${cacheKey}`);

                    // Set cache headers
                    res.set('X-Cache', 'HIT');
                    res.set('X-Cache-Key', cacheKey);

                    // Send cached response
                    return res.json(cachedResponse);
                }

                logger.debug(`Cache miss for key: ${cacheKey}`);

                // Intercept response to cache it
                const originalJson = res.json;
                const cacheManagerRef = this.cacheManager;
                res.json = function (body: any) {
                    // Only cache successful responses
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        // Check condition before caching
                        if (!options.condition || options.condition(req, res)) {
                            setImmediate(async () => {
                                try {
                                    await cacheManagerRef.set(cacheKey, body, options.strategy);
                                    logger.debug(`Response cached for key: ${cacheKey}`);
                                } catch (error) {
                                    logger.error(`Failed to cache response for key ${cacheKey}:`, error);
                                }
                            });
                        }
                    }

                    // Set cache headers
                    res.set('X-Cache', 'MISS');
                    res.set('X-Cache-Key', cacheKey);

                    return originalJson.call(this, body);
                };

                next();
            } catch (error) {
                logger.error(`Cache middleware error for key ${cacheKey}:`, error);
                next();
            }
        };
    }

    private generateCacheKey(req: Request, options: CacheMiddlewareOptions): string {
        if (options.keyGenerator) {
            return options.keyGenerator(req);
        }

        // Default key generation
        let key = `api:${req.method}:${req.path}`;

        // Include query parameters
        const queryKeys = Object.keys(req.query).sort();
        if (queryKeys.length > 0) {
            const queryString = queryKeys
                .map(k => `${k}=${req.query[k]}`)
                .join('&');
            key += `?${queryString}`;
        }

        // Include vary-by headers
        if (options.varyBy) {
            const varyValues = options.varyBy
                .map(header => `${header}:${req.get(header) || ''}`)
                .join('|');
            key += `|${varyValues}`;
        }

        // Include user context if available
        if (req.user?.id) {
            key += `|user:${req.user.id}`;
        }

        return key;
    }

    invalidate(pattern: string) {
        return async (req: Request, res: Response, next: NextFunction) => {
            try {
                const count = await this.cacheManager.invalidateByPattern(pattern);
                logger.debug(`Invalidated ${count} cache entries matching pattern: ${pattern}`);
            } catch (error) {
                logger.error(`Cache invalidation error for pattern ${pattern}:`, error);
            }
            next();
        };
    }

    invalidateByTag(tag: string) {
        return async (req: Request, res: Response, next: NextFunction) => {
            try {
                const count = await this.cacheManager.invalidateByTag(tag);
                logger.debug(`Invalidated ${count} cache entries with tag: ${tag}`);
            } catch (error) {
                logger.error(`Cache invalidation error for tag ${tag}:`, error);
            }
            next();
        };
    }

    // Predefined cache strategies for common endpoints
    static userProfile(cacheManager: CacheManager) {
        return new CacheMiddleware(cacheManager).cache({
            strategy: 'user',
            keyGenerator: (req) => `user:profile:${req.params.userId || req.user?.id}`,
            condition: (req, res) => res.statusCode === 200,
        });
    }

    static problemList(cacheManager: CacheManager) {
        return new CacheMiddleware(cacheManager).cache({
            strategy: 'problem',
            keyGenerator: (req) => {
                const { page = 1, limit = 20, difficulty, tags } = req.query;
                return `problems:list:page:${page}:limit:${limit}:difficulty:${difficulty || 'all'}:tags:${tags || 'all'}`;
            },
        });
    }

    static problemDetail(cacheManager: CacheManager) {
        return new CacheMiddleware(cacheManager).cache({
            strategy: 'problem',
            keyGenerator: (req) => `problem:detail:${req.params.problemId}`,
            varyBy: ['Authorization'], // Vary by user for personalized data
        });
    }

    static leaderboard(cacheManager: CacheManager) {
        return new CacheMiddleware(cacheManager).cache({
            strategy: 'leaderboard',
            keyGenerator: (req) => `leaderboard:${req.params.contestId || 'global'}`,
        });
    }

    static analytics(cacheManager: CacheManager) {
        return new CacheMiddleware(cacheManager).cache({
            strategy: 'analytics',
            keyGenerator: (req) => {
                const { timeframe = 'day', metric } = req.query;
                return `analytics:${metric}:${timeframe}:${req.user?.id || 'global'}`;
            },
        });
    }
}

// Cache warming utilities
export class CacheWarmer {
    private cacheManager: CacheManager;

    constructor(cacheManager: CacheManager) {
        this.cacheManager = cacheManager;
    }

    async warmPopularProblems(problemService: any): Promise<void> {
        try {
            const popularProblems = await problemService.getPopularProblems(50);

            const warmers = popularProblems.map((problem: any) => ({
                key: `problem:detail:${problem.id}`,
                fetcher: () => problemService.getProblemById(problem.id),
                strategy: 'problem',
            }));

            await this.cacheManager.warmCache(warmers);
            logger.info(`Warmed cache for ${warmers.length} popular problems`);
        } catch (error) {
            logger.error('Failed to warm popular problems cache:', error);
        }
    }

    async warmUserProfiles(userService: any, userIds: string[]): Promise<void> {
        try {
            const warmers = userIds.map(userId => ({
                key: `user:profile:${userId}`,
                fetcher: () => userService.getUserProfile(userId),
                strategy: 'user',
            }));

            await this.cacheManager.warmCache(warmers);
            logger.info(`Warmed cache for ${warmers.length} user profiles`);
        } catch (error) {
            logger.error('Failed to warm user profiles cache:', error);
        }
    }

    async warmContestLeaderboards(contestService: any): Promise<void> {
        try {
            const activeContests = await contestService.getActiveContests();

            const warmers = activeContests.map((contest: any) => ({
                key: `leaderboard:${contest.id}`,
                fetcher: () => contestService.getLeaderboard(contest.id),
                strategy: 'leaderboard',
            }));

            await this.cacheManager.warmCache(warmers);
            logger.info(`Warmed cache for ${warmers.length} contest leaderboards`);
        } catch (error) {
            logger.error('Failed to warm contest leaderboards cache:', error);
        }
    }
}