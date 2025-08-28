import { RecommendationService } from '../../src/services/RecommendationService';
import { BehaviorAnalysisService } from '../../src/services/BehaviorAnalysisService';
import { testDataSource } from '../setup';
import { UserBehaviorPattern } from '../../src/entities/UserBehaviorPattern';
import { PerformanceMetrics } from '../../src/entities/PerformanceMetrics';

// Mock Redis
jest.mock('ioredis', () => {
    return jest.fn().mockImplementation(() => ({
        connect: jest.fn().mockResolvedValue(undefined),
        get: jest.fn().mockResolvedValue(null),
        setex: jest.fn().mockResolvedValue('OK'),
    }));
});

// Mock BehaviorAnalysisService
jest.mock('../../src/services/BehaviorAnalysisService');

describe('RecommendationService', () => {
    let recommendationService: RecommendationService;
    let behaviorRepository: any;
    let metricsRepository: any;
    let mockBehaviorService: jest.Mocked<BehaviorAnalysisService>;

    beforeEach(() => {
        behaviorRepository = testDataSource.getRepository(UserBehaviorPattern);
        metricsRepository = testDataSource.getRepository(PerformanceMetrics);

        mockBehaviorService = new BehaviorAnalysisService() as jest.Mocked<BehaviorAnalysisService>;
        recommendationService = new RecommendationService();

        // Set up the mock behavior service
        (recommendationService as any).behaviorService = mockBehaviorService;
    });

    describe('generateRecommendations', () => {
        it('should generate problem recommendations', async () => {
            const userId = 'user-123';

            // Mock behavior analysis
            mockBehaviorService.analyzeUserBehavior.mockResolvedValue({
                userId,
                patterns: {
                    sessionDuration: 1800,
                    problemsSolved: 10,
                    preferredDifficulty: 'medium',
                    activeHours: [9, 14],
                    streakDays: 5,
                    dropoffPoints: [],
                },
                lastUpdated: new Date(),
            });

            // Create some performance metrics
            const metrics = [
                metricsRepository.create({
                    userId,
                    problemId: 'prob-1',
                    metrics: {
                        solutionTime: 300,
                        attempts: 2,
                        hintsUsed: 1,
                        codeQuality: 0.8,
                        efficiency: 0.7,
                    },
                    timestamp: new Date(),
                }),
            ];
            await metricsRepository.save(metrics);

            const request = {
                userId,
                type: 'problem' as const,
                limit: 5,
            };

            const recommendations = await recommendationService.generateRecommendations(request);

            expect(recommendations).toBeInstanceOf(Array);
            expect(recommendations.length).toBeGreaterThan(0);
            expect(recommendations[0]).toHaveProperty('id');
            expect(recommendations[0]).toHaveProperty('type');
            expect(recommendations[0]).toHaveProperty('score');
            expect(recommendations[0]).toHaveProperty('reason');
            expect(recommendations[0]).toHaveProperty('metadata');
        });

        it('should generate learning path recommendations', async () => {
            const userId = 'user-123';

            mockBehaviorService.analyzeUserBehavior.mockResolvedValue({
                userId,
                patterns: {
                    sessionDuration: 1200,
                    problemsSolved: 5,
                    preferredDifficulty: 'easy',
                    activeHours: [20],
                    streakDays: 2,
                    dropoffPoints: ['multiple_failed_submissions'],
                },
                lastUpdated: new Date(),
            });

            // Create metrics showing weak performance in certain areas
            const metrics = [
                metricsRepository.create({
                    userId,
                    problemId: 'prob-1',
                    metrics: {
                        solutionTime: 600,
                        attempts: 5,
                        hintsUsed: 3,
                        codeQuality: 0.4,
                        efficiency: 0.3,
                    },
                    timestamp: new Date(),
                }),
            ];
            await metricsRepository.save(metrics);

            const request = {
                userId,
                type: 'learning_path' as const,
                limit: 3,
            };

            const recommendations = await recommendationService.generateRecommendations(request);

            expect(recommendations).toBeInstanceOf(Array);
            expect(recommendations.some(r => r.type === 'learning_path')).toBe(true);
        });

        it('should generate contest recommendations', async () => {
            const userId = 'user-123';

            mockBehaviorService.analyzeUserBehavior.mockResolvedValue({
                userId,
                patterns: {
                    sessionDuration: 2400,
                    problemsSolved: 25,
                    preferredDifficulty: 'hard',
                    activeHours: [18, 19, 20],
                    streakDays: 15,
                    dropoffPoints: [],
                },
                lastUpdated: new Date(),
            });

            mockBehaviorService.calculateEngagementScore.mockResolvedValue(85);

            const request = {
                userId,
                type: 'contest' as const,
                limit: 3,
            };

            const recommendations = await recommendationService.generateRecommendations(request);

            expect(recommendations).toBeInstanceOf(Array);
            expect(recommendations.some(r => r.type === 'contest')).toBe(true);
        });

        it('should return cached recommendations if available', async () => {
            const userId = 'user-cached';

            // Mock Redis to return cached data
            const mockRedis = require('ioredis');
            const cachedRecommendations = [
                {
                    id: 'cached-rec-1',
                    type: 'problem',
                    score: 0.9,
                    reason: 'Cached recommendation',
                    metadata: {},
                },
            ];

            mockRedis.mockImplementation(() => ({
                connect: jest.fn().mockResolvedValue(undefined),
                get: jest.fn().mockResolvedValue(JSON.stringify(cachedRecommendations)),
                setex: jest.fn().mockResolvedValue('OK'),
            }));

            const request = {
                userId,
                type: 'problem' as const,
            };

            const recommendations = await recommendationService.generateRecommendations(request);

            expect(recommendations).toEqual(cachedRecommendations);
        });

        it('should limit recommendations to specified limit', async () => {
            const userId = 'user-123';

            mockBehaviorService.analyzeUserBehavior.mockResolvedValue({
                userId,
                patterns: {
                    sessionDuration: 1800,
                    problemsSolved: 10,
                    preferredDifficulty: 'medium',
                    activeHours: [9, 14],
                    streakDays: 5,
                    dropoffPoints: [],
                },
                lastUpdated: new Date(),
            });

            const request = {
                userId,
                type: 'problem' as const,
                limit: 2,
            };

            const recommendations = await recommendationService.generateRecommendations(request);

            expect(recommendations.length).toBeLessThanOrEqual(2);
        });

        it('should handle errors gracefully', async () => {
            const userId = 'user-error';

            mockBehaviorService.analyzeUserBehavior.mockRejectedValue(new Error('Analysis failed'));

            const request = {
                userId,
                type: 'problem' as const,
            };

            await expect(recommendationService.generateRecommendations(request))
                .rejects.toThrow('Analysis failed');
        });
    });

    describe('collaborative filtering', () => {
        it('should find similar users based on behavior patterns', async () => {
            const targetUserId = 'user-target';
            const similarUserId = 'user-similar';
            const differentUserId = 'user-different';

            // Create behavior patterns
            const patterns = [
                behaviorRepository.create({
                    userId: targetUserId,
                    patterns: {
                        sessionDuration: 1800,
                        problemsSolved: 15,
                        preferredDifficulty: 'medium',
                        activeHours: [9, 14, 20],
                        streakDays: 7,
                        dropoffPoints: [],
                    },
                    lastUpdated: new Date(),
                }),
                behaviorRepository.create({
                    userId: similarUserId,
                    patterns: {
                        sessionDuration: 1900, // Similar
                        problemsSolved: 16,    // Similar
                        preferredDifficulty: 'medium', // Same
                        activeHours: [9, 14, 19], // Similar
                        streakDays: 8,         // Similar
                        dropoffPoints: [],
                    },
                    lastUpdated: new Date(),
                }),
                behaviorRepository.create({
                    userId: differentUserId,
                    patterns: {
                        sessionDuration: 600,  // Very different
                        problemsSolved: 3,     // Very different
                        preferredDifficulty: 'easy', // Different
                        activeHours: [22, 23], // Different
                        streakDays: 1,         // Different
                        dropoffPoints: ['multiple_failed_submissions'],
                    },
                    lastUpdated: new Date(),
                }),
            ];

            await behaviorRepository.save(patterns);

            mockBehaviorService.analyzeUserBehavior.mockResolvedValue({
                userId: targetUserId,
                patterns: patterns[0].patterns,
                lastUpdated: new Date(),
            });

            const request = {
                userId: targetUserId,
                type: 'problem' as const,
            };

            const recommendations = await recommendationService.generateRecommendations(request);

            // Should include collaborative filtering recommendations
            expect(recommendations.some(r =>
                r.metadata?.source === 'collaborative_filtering'
            )).toBe(true);
        });
    });
});