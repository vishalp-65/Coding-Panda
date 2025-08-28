import { BehaviorAnalysisService } from '../../src/services/BehaviorAnalysisService';
import { testDataSource } from '../setup';
import { AnalyticsEvent } from '../../src/entities/AnalyticsEvent';
import { UserBehaviorPattern } from '../../src/entities/UserBehaviorPattern';

// Mock Redis
jest.mock('ioredis', () => {
    return jest.fn().mockImplementation(() => ({
        connect: jest.fn().mockResolvedValue(undefined),
        get: jest.fn().mockResolvedValue(null),
        setex: jest.fn().mockResolvedValue('OK'),
    }));
});

describe('BehaviorAnalysisService', () => {
    let behaviorAnalysisService: BehaviorAnalysisService;
    let eventRepository: any;
    let behaviorRepository: any;

    beforeEach(() => {
        eventRepository = testDataSource.getRepository(AnalyticsEvent);
        behaviorRepository = testDataSource.getRepository(UserBehaviorPattern);
        behaviorAnalysisService = new BehaviorAnalysisService();
    });

    describe('analyzeUserBehavior', () => {
        it('should analyze user behavior patterns', async () => {
            const userId = 'user-123';

            // Create test events spanning multiple sessions
            const events = [
                eventRepository.create({
                    userId,
                    eventType: 'session_start',
                    eventData: {},
                    timestamp: new Date('2023-06-15T09:00:00Z'),
                }),
                eventRepository.create({
                    userId,
                    eventType: 'problem_view',
                    eventData: { difficulty: 'medium' },
                    timestamp: new Date('2023-06-15T09:05:00Z'),
                }),
                eventRepository.create({
                    userId,
                    eventType: 'problem_solved',
                    eventData: { difficulty: 'medium' },
                    timestamp: new Date('2023-06-15T09:30:00Z'),
                }),
                eventRepository.create({
                    userId,
                    eventType: 'session_start',
                    eventData: {},
                    timestamp: new Date('2023-06-16T14:00:00Z'),
                }),
                eventRepository.create({
                    userId,
                    eventType: 'problem_view',
                    eventData: { difficulty: 'easy' },
                    timestamp: new Date('2023-06-16T14:10:00Z'),
                }),
            ];

            await eventRepository.save(events);

            const analysis = await behaviorAnalysisService.analyzeUserBehavior(userId);

            expect(analysis).toHaveProperty('userId', userId);
            expect(analysis).toHaveProperty('patterns');
            expect(analysis.patterns).toHaveProperty('sessionDuration');
            expect(analysis.patterns).toHaveProperty('problemsSolved');
            expect(analysis.patterns).toHaveProperty('preferredDifficulty');
            expect(analysis.patterns).toHaveProperty('activeHours');
            expect(analysis.patterns).toHaveProperty('streakDays');
            expect(analysis.patterns).toHaveProperty('dropoffPoints');
        });

        it('should return cached analysis if available', async () => {
            const userId = 'user-cached';

            // Mock Redis to return cached data
            const mockRedis = require('ioredis');
            const cachedData = {
                userId,
                patterns: {
                    sessionDuration: 1800,
                    problemsSolved: 5,
                    preferredDifficulty: 'medium',
                    activeHours: [9, 14],
                    streakDays: 3,
                    dropoffPoints: [],
                },
                lastUpdated: new Date(),
            };

            mockRedis.mockImplementation(() => ({
                connect: jest.fn().mockResolvedValue(undefined),
                get: jest.fn().mockResolvedValue(JSON.stringify(cachedData)),
                setex: jest.fn().mockResolvedValue('OK'),
            }));

            const analysis = await behaviorAnalysisService.analyzeUserBehavior(userId);
            expect(analysis.userId).toBe(userId);
            expect(analysis.patterns.problemsSolved).toBe(5);
        });

        it('should handle users with no events', async () => {
            const userId = 'user-no-events';

            const analysis = await behaviorAnalysisService.analyzeUserBehavior(userId);

            expect(analysis.userId).toBe(userId);
            expect(analysis.patterns.sessionDuration).toBe(0);
            expect(analysis.patterns.problemsSolved).toBe(0);
        });
    });

    describe('calculateEngagementScore', () => {
        it('should calculate engagement score based on behavior patterns', async () => {
            const userId = 'user-engaged';

            // Create behavior pattern
            const behaviorPattern = behaviorRepository.create({
                userId,
                patterns: {
                    sessionDuration: 3600, // 1 hour
                    problemsSolved: 20,
                    preferredDifficulty: 'medium',
                    activeHours: [9, 10, 14, 15, 20, 21],
                    streakDays: 15,
                    dropoffPoints: [],
                },
                lastUpdated: new Date(),
            });

            await behaviorRepository.save(behaviorPattern);

            const score = await behaviorAnalysisService.calculateEngagementScore(userId);

            expect(score).toBeGreaterThan(0);
            expect(score).toBeLessThanOrEqual(100);
        });

        it('should penalize users with many dropoff points', async () => {
            const userId = 'user-dropoff';

            const behaviorPattern = behaviorRepository.create({
                userId,
                patterns: {
                    sessionDuration: 1800,
                    problemsSolved: 10,
                    preferredDifficulty: 'medium',
                    activeHours: [9, 14],
                    streakDays: 5,
                    dropoffPoints: ['multiple_failed_submissions', 'excessive_hint_usage'],
                },
                lastUpdated: new Date(),
            });

            await behaviorRepository.save(behaviorPattern);

            const score = await behaviorAnalysisService.calculateEngagementScore(userId);

            expect(score).toBeGreaterThan(0);
            // Score should be lower due to dropoff points
        });

        it('should give bonus for long streaks', async () => {
            const userId = 'user-streak';

            const behaviorPattern = behaviorRepository.create({
                userId,
                patterns: {
                    sessionDuration: 2400,
                    problemsSolved: 15,
                    preferredDifficulty: 'medium',
                    activeHours: [9, 14, 20],
                    streakDays: 35, // Long streak
                    dropoffPoints: [],
                },
                lastUpdated: new Date(),
            });

            await behaviorRepository.save(behaviorPattern);

            const score = await behaviorAnalysisService.calculateEngagementScore(userId);

            expect(score).toBeGreaterThan(70); // Should be high due to long streak
        });
    });

    describe('identifyDropoffPoints', () => {
        it('should identify problem view without attempt dropoff', async () => {
            const userId = 'user-dropoff-view';

            const events = [
                eventRepository.create({
                    userId,
                    eventType: 'problem_view',
                    eventData: {},
                    timestamp: new Date('2023-06-15T09:00:00Z'),
                    sessionId: 'session-1',
                }),
            ];

            await eventRepository.save(events);

            const dropoffPoints = await behaviorAnalysisService.identifyDropoffPoints(userId);

            expect(dropoffPoints).toContain('problem_view_without_attempt');
        });

        it('should identify multiple failed submissions dropoff', async () => {
            const userId = 'user-dropoff-failed';

            const events = [
                eventRepository.create({
                    userId,
                    eventType: 'code_submission_failed',
                    eventData: {},
                    timestamp: new Date('2023-06-15T09:00:00Z'),
                    sessionId: 'session-1',
                }),
                eventRepository.create({
                    userId,
                    eventType: 'code_submission_failed',
                    eventData: {},
                    timestamp: new Date('2023-06-15T09:05:00Z'),
                    sessionId: 'session-1',
                }),
                eventRepository.create({
                    userId,
                    eventType: 'code_submission_failed',
                    eventData: {},
                    timestamp: new Date('2023-06-15T09:10:00Z'),
                    sessionId: 'session-1',
                }),
            ];

            await eventRepository.save(events);

            const dropoffPoints = await behaviorAnalysisService.identifyDropoffPoints(userId);

            expect(dropoffPoints).toContain('multiple_failed_submissions');
        });

        it('should identify excessive hint usage dropoff', async () => {
            const userId = 'user-dropoff-hints';

            const events = Array.from({ length: 6 }, (_, i) =>
                eventRepository.create({
                    userId,
                    eventType: 'hint_requested',
                    eventData: {},
                    timestamp: new Date(`2023-06-15T09:0${i}:00Z`),
                    sessionId: 'session-1',
                })
            );

            await eventRepository.save(events);

            const dropoffPoints = await behaviorAnalysisService.identifyDropoffPoints(userId);

            expect(dropoffPoints).toContain('excessive_hint_usage');
        });

        it('should return empty array for users with no dropoff patterns', async () => {
            const userId = 'user-no-dropoff';

            const events = [
                eventRepository.create({
                    userId,
                    eventType: 'problem_view',
                    eventData: {},
                    timestamp: new Date('2023-06-15T09:00:00Z'),
                    sessionId: 'session-1',
                }),
                eventRepository.create({
                    userId,
                    eventType: 'code_submission',
                    eventData: {},
                    timestamp: new Date('2023-06-15T09:05:00Z'),
                    sessionId: 'session-1',
                }),
                eventRepository.create({
                    userId,
                    eventType: 'problem_solved',
                    eventData: {},
                    timestamp: new Date('2023-06-15T09:10:00Z'),
                    sessionId: 'session-1',
                }),
            ];

            await eventRepository.save(events);

            const dropoffPoints = await behaviorAnalysisService.identifyDropoffPoints(userId);

            expect(dropoffPoints).toHaveLength(0);
        });
    });
});