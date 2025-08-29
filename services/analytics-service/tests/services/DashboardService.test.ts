import { DashboardService } from '../../src/services/DashboardService';
import { testDataSource } from '../setup';
import { AnalyticsEvent } from '../../src/entities/AnalyticsEvent';
import { EngagementMetrics } from '../../src/entities/EngagementMetrics';

// Mock Redis
jest.mock('ioredis', () => {
    return jest.fn().mockImplementation(() => ({
        connect: jest.fn().mockResolvedValue(undefined),
        get: jest.fn().mockResolvedValue(null),
        setex: jest.fn().mockResolvedValue('OK'),
        scard: jest.fn().mockResolvedValue(100),
        keys: jest.fn().mockResolvedValue(['key1', 'key2']),
    }));
});

describe('DashboardService', () => {
    let dashboardService: DashboardService;
    let eventRepository: any;
    let engagementRepository: any;

    beforeEach(() => {
        eventRepository = testDataSource.getRepository(AnalyticsEvent);
        engagementRepository = testDataSource.getRepository(EngagementMetrics);
        dashboardService = new DashboardService();
    });

    describe('getDashboardData', () => {
        it('should return comprehensive dashboard data', async () => {
            // Create test data
            const events = [
                eventRepository.create({
                    userId: 'user-1',
                    eventType: 'code_submission',
                    eventData: {},
                    timestamp: new Date('2023-06-15'),
                }),
                eventRepository.create({
                    userId: 'user-2',
                    eventType: 'problem_solved',
                    eventData: {},
                    timestamp: new Date('2023-06-16'),
                }),
            ];

            await eventRepository.save(events);

            const engagementData = [
                engagementRepository.create({
                    userId: 'user-1',
                    date: new Date('2023-06-15'),
                    metrics: {
                        sessionCount: 2,
                        totalTime: 3600,
                        problemsAttempted: 3,
                        problemsSolved: 1,
                        streakDays: 5,
                        lastActive: new Date('2023-06-15T20:00:00Z'),
                    },
                }),
                engagementRepository.create({
                    userId: 'user-2',
                    date: new Date('2023-06-16'),
                    metrics: {
                        sessionCount: 1,
                        totalTime: 1800,
                        problemsAttempted: 2,
                        problemsSolved: 2,
                        streakDays: 3,
                        lastActive: new Date('2023-06-16T19:00:00Z'),
                    },
                }),
            ];

            await engagementRepository.save(engagementData);

            const dashboardData = await dashboardService.getDashboardData('30d');

            expect(dashboardData).toHaveProperty('overview');
            expect(dashboardData).toHaveProperty('engagement');
            expect(dashboardData).toHaveProperty('performance');
            expect(dashboardData).toHaveProperty('retention');

            expect(dashboardData.overview).toHaveProperty('totalUsers');
            expect(dashboardData.overview).toHaveProperty('activeUsers');
            expect(dashboardData.overview).toHaveProperty('totalProblems');
            expect(dashboardData.overview).toHaveProperty('totalSubmissions');

            expect(dashboardData.engagement).toHaveProperty('dailyActiveUsers');
            expect(dashboardData.engagement).toHaveProperty('averageSessionTime');
            expect(dashboardData.engagement).toHaveProperty('problemCompletionRate');
        });

        it('should return cached data when available', async () => {
            // Mock Redis to return cached data
            const mockRedis = require('ioredis');
            const cachedData = {
                overview: { totalUsers: 1000, activeUsers: 500, totalProblems: 100, totalSubmissions: 5000 },
                engagement: { dailyActiveUsers: [50, 60, 70], averageSessionTime: 1800, problemCompletionRate: 75 },
                performance: { averageResponseTime: 150, errorRate: 0.5, throughput: 1200 },
                retention: [],
            };

            mockRedis.mockImplementation(() => ({
                connect: jest.fn().mockResolvedValue(undefined),
                get: jest.fn().mockResolvedValue(JSON.stringify(cachedData)),
                setex: jest.fn().mockResolvedValue('OK'),
            }));

            const dashboardData = await dashboardService.getDashboardData('30d');
            expect(dashboardData).toEqual(cachedData);
        });
    });

    describe('getRealtimeMetrics', () => {
        it('should return real-time metrics', async () => {
            const realtimeMetrics = await dashboardService.getRealtimeMetrics();

            expect(realtimeMetrics).toHaveProperty('activeUsersToday');
            expect(realtimeMetrics).toHaveProperty('eventsToday');
            expect(realtimeMetrics).toHaveProperty('eventsThisHour');
            expect(realtimeMetrics).toHaveProperty('onlineUsers');
            expect(realtimeMetrics).toHaveProperty('timestamp');

            expect(typeof realtimeMetrics.activeUsersToday).toBe('number');
            expect(typeof realtimeMetrics.eventsToday).toBe('number');
            expect(typeof realtimeMetrics.eventsThisHour).toBe('number');
            expect(typeof realtimeMetrics.onlineUsers).toBe('number');
            expect(realtimeMetrics.timestamp).toBeInstanceOf(Date);
        });
    });

    describe('getUserEngagementTrends', () => {
        it('should return engagement trends for all users', async () => {
            const engagementData = [
                engagementRepository.create({
                    userId: 'user-1',
                    date: new Date('2023-06-15'),
                    metrics: {
                        sessionCount: 2,
                        totalTime: 3600,
                        problemsAttempted: 3,
                        problemsSolved: 1,
                        streakDays: 5,
                        lastActive: new Date(),
                    },
                }),
                engagementRepository.create({
                    userId: 'user-2',
                    date: new Date('2023-06-15'),
                    metrics: {
                        sessionCount: 1,
                        totalTime: 1800,
                        problemsAttempted: 2,
                        problemsSolved: 2,
                        streakDays: 3,
                        lastActive: new Date(),
                    },
                }),
                engagementRepository.create({
                    userId: 'user-1',
                    date: new Date('2023-06-16'),
                    metrics: {
                        sessionCount: 3,
                        totalTime: 5400,
                        problemsAttempted: 4,
                        problemsSolved: 3,
                        streakDays: 6,
                        lastActive: new Date(),
                    },
                }),
            ];

            await engagementRepository.save(engagementData);

            const trends = await dashboardService.getUserEngagementTrends(undefined, 30);

            expect(trends).toBeInstanceOf(Array);
            expect(trends.length).toBeGreaterThan(0);

            const dayData = trends[0];
            expect(dayData).toHaveProperty('date');
            expect(dayData).toHaveProperty('totalUsers');
            expect(dayData).toHaveProperty('totalSessions');
            expect(dayData).toHaveProperty('avgSessionsPerUser');
            expect(dayData).toHaveProperty('avgTimePerUser');
        });

        it('should return engagement trends for specific user', async () => {
            const userId = 'user-specific';

            const engagementData = [
                engagementRepository.create({
                    userId,
                    date: new Date('2023-06-15'),
                    metrics: {
                        sessionCount: 2,
                        totalTime: 3600,
                        problemsAttempted: 3,
                        problemsSolved: 1,
                        streakDays: 5,
                        lastActive: new Date(),
                    },
                }),
                engagementRepository.create({
                    userId: 'other-user',
                    date: new Date('2023-06-15'),
                    metrics: {
                        sessionCount: 1,
                        totalTime: 1800,
                        problemsAttempted: 2,
                        problemsSolved: 2,
                        streakDays: 3,
                        lastActive: new Date(),
                    },
                }),
            ];

            await engagementRepository.save(engagementData);

            const trends = await dashboardService.getUserEngagementTrends(userId, 30);

            expect(trends).toBeInstanceOf(Array);
            // Should only include data for the specific user
            const dayData = trends.find((d: any) => d.date === '2023-06-15');
            expect(dayData?.totalUsers).toBe(1);
        });
    });

    describe('getTopPerformers', () => {
        it('should return top performers by problems solved', async () => {
            const engagementData = [
                engagementRepository.create({
                    userId: 'user-top',
                    date: new Date('2023-06-15'),
                    metrics: {
                        sessionCount: 5,
                        totalTime: 7200,
                        problemsAttempted: 10,
                        problemsSolved: 8, // High performer
                        streakDays: 15,
                        lastActive: new Date(),
                    },
                }),
                engagementRepository.create({
                    userId: 'user-average',
                    date: new Date('2023-06-15'),
                    metrics: {
                        sessionCount: 2,
                        totalTime: 3600,
                        problemsAttempted: 5,
                        problemsSolved: 3, // Average performer
                        streakDays: 5,
                        lastActive: new Date(),
                    },
                }),
                engagementRepository.create({
                    userId: 'user-low',
                    date: new Date('2023-06-15'),
                    metrics: {
                        sessionCount: 1,
                        totalTime: 1800,
                        problemsAttempted: 2,
                        problemsSolved: 1, // Low performer
                        streakDays: 2,
                        lastActive: new Date(),
                    },
                }),
            ];

            await engagementRepository.save(engagementData);

            const topPerformers = await dashboardService.getTopPerformers('totalProblemsSolved', 2);

            expect(topPerformers).toHaveLength(2);
            expect(topPerformers[0].userId).toBe('user-top');
            expect(topPerformers[0].totalProblemsSolved).toBe(8);
            expect(topPerformers[1].userId).toBe('user-average');
            expect(topPerformers[1].totalProblemsSolved).toBe(3);
        });

        it('should return cached top performers when available', async () => {
            // Mock Redis to return cached data
            const mockRedis = require('ioredis');
            const cachedPerformers = [
                { userId: 'cached-user-1', totalProblemsSolved: 50 },
                { userId: 'cached-user-2', totalProblemsSolved: 45 },
            ];

            mockRedis.mockImplementation(() => ({
                connect: jest.fn().mockResolvedValue(undefined),
                get: jest.fn().mockResolvedValue(JSON.stringify(cachedPerformers)),
                setex: jest.fn().mockResolvedValue('OK'),
            }));

            const topPerformers = await dashboardService.getTopPerformers('totalProblemsSolved', 10);
            expect(topPerformers).toEqual(cachedPerformers);
        });
    });

    describe('getSystemHealthMetrics', () => {
        it('should return system health metrics', async () => {
            // Create some error events
            const events = [
                eventRepository.create({
                    userId: 'user-1',
                    eventType: 'error',
                    eventData: { error: 'Database timeout' },
                    timestamp: new Date(),
                }),
                eventRepository.create({
                    userId: 'user-2',
                    eventType: 'page_view',
                    eventData: {},
                    timestamp: new Date(),
                }),
                eventRepository.create({
                    userId: 'user-3',
                    eventType: 'code_submission',
                    eventData: {},
                    timestamp: new Date(),
                }),
            ];

            await eventRepository.save(events);

            const healthMetrics = await dashboardService.getSystemHealthMetrics();

            expect(healthMetrics).toHaveProperty('errorRate');
            expect(healthMetrics).toHaveProperty('averageResponseTime');
            expect(healthMetrics).toHaveProperty('throughput');
            expect(healthMetrics).toHaveProperty('totalEvents');
            expect(healthMetrics).toHaveProperty('errorEvents');
            expect(healthMetrics).toHaveProperty('timestamp');

            expect(typeof healthMetrics.errorRate).toBe('number');
            expect(healthMetrics.errorRate).toBeGreaterThanOrEqual(0);
            expect(healthMetrics.errorRate).toBeLessThanOrEqual(100);
            expect(healthMetrics.totalEvents).toBe(3);
            expect(healthMetrics.errorEvents).toBe(1);
        });

        it('should handle zero events gracefully', async () => {
            const healthMetrics = await dashboardService.getSystemHealthMetrics();

            expect(healthMetrics.errorRate).toBe(0);
            expect(healthMetrics.totalEvents).toBe(0);
            expect(healthMetrics.errorEvents).toBe(0);
        });
    });

    describe('date range handling', () => {
        it('should handle different time ranges correctly', async () => {
            const testCases = ['7d', '30d', '90d'];

            for (const timeRange of testCases) {
                const dashboardData = await dashboardService.getDashboardData(timeRange);

                expect(dashboardData).toHaveProperty('overview');
                expect(dashboardData).toHaveProperty('engagement');
                expect(dashboardData).toHaveProperty('performance');
                expect(dashboardData).toHaveProperty('retention');
            }
        });

        it('should default to 30d for invalid time range', async () => {
            const dashboardData = await dashboardService.getDashboardData('invalid');

            expect(dashboardData).toHaveProperty('overview');
            // Should not throw error and return valid data structure
        });
    });
});