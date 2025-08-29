import { EventTrackingService } from '../../src/services/EventTrackingService';
import { testDataSource } from '../setup';
import { AnalyticsEvent } from '../../src/entities/AnalyticsEvent';

// Mock Redis
jest.mock('ioredis', () => {
    return jest.fn().mockImplementation(() => ({
        connect: jest.fn().mockResolvedValue(undefined),
        lpush: jest.fn().mockResolvedValue(1),
        ltrim: jest.fn().mockResolvedValue('OK'),
        expire: jest.fn().mockResolvedValue(1),
        lrange: jest.fn().mockResolvedValue([]),
        sadd: jest.fn().mockResolvedValue(1),
        incr: jest.fn().mockResolvedValue(1),
        set: jest.fn().mockResolvedValue('OK'),
    }));
});

// Mock Bull Queue
jest.mock('bull', () => {
    return jest.fn().mockImplementation(() => ({
        add: jest.fn().mockResolvedValue({ id: 'job-id' }),
        process: jest.fn(),
    }));
});

describe('EventTrackingService', () => {
    let eventTrackingService: EventTrackingService;
    let eventRepository: any;

    beforeEach(() => {
        eventRepository = testDataSource.getRepository(AnalyticsEvent);
        eventTrackingService = new EventTrackingService();
    });

    describe('trackEvent', () => {
        it('should track an event successfully', async () => {
            const eventData = {
                userId: 'user-123',
                eventType: 'problem_view',
                eventData: { problemId: 'prob-456' },
                sessionId: 'session-789',
            };

            await expect(eventTrackingService.trackEvent(eventData)).resolves.not.toThrow();
        });

        it('should handle tracking errors gracefully', async () => {
            const eventData = {
                userId: 'user-123',
                eventType: 'problem_view',
                eventData: { problemId: 'prob-456' },
            };

            // Mock queue failure
            const mockQueue = require('bull');
            mockQueue.mockImplementation(() => ({
                add: jest.fn().mockRejectedValue(new Error('Queue error')),
                process: jest.fn(),
            }));

            await expect(eventTrackingService.trackEvent(eventData)).rejects.toThrow('Queue error');
        });
    });

    describe('getRecentEvents', () => {
        it('should return recent events for a user', async () => {
            const userId = 'user-123';

            // Create test events
            const events = [
                eventRepository.create({
                    userId,
                    eventType: 'problem_view',
                    eventData: { problemId: 'prob-1' },
                    timestamp: new Date(),
                }),
                eventRepository.create({
                    userId,
                    eventType: 'code_submission',
                    eventData: { problemId: 'prob-1', result: 'accepted' },
                    timestamp: new Date(),
                }),
            ];

            await eventRepository.save(events);

            const recentEvents = await eventTrackingService.getRecentEvents(userId, 10);
            expect(recentEvents).toHaveLength(2);
            expect(recentEvents[0].userId).toBe(userId);
        });

        it('should limit the number of returned events', async () => {
            const userId = 'user-123';

            // Create more events than the limit
            const events = Array.from({ length: 15 }, (_, i) =>
                eventRepository.create({
                    userId,
                    eventType: 'problem_view',
                    eventData: { problemId: `prob-${i}` },
                    timestamp: new Date(),
                })
            );

            await eventRepository.save(events);

            const recentEvents = await eventTrackingService.getRecentEvents(userId, 10);
            expect(recentEvents.length).toBeLessThanOrEqual(10);
        });
    });

    describe('getUserEventStats', () => {
        it('should return event statistics for a user', async () => {
            const userId = 'user-123';

            // Create test events
            const events = [
                eventRepository.create({
                    userId,
                    eventType: 'problem_view',
                    eventData: {},
                    timestamp: new Date(),
                }),
                eventRepository.create({
                    userId,
                    eventType: 'problem_view',
                    eventData: {},
                    timestamp: new Date(),
                }),
                eventRepository.create({
                    userId,
                    eventType: 'code_submission',
                    eventData: {},
                    timestamp: new Date(),
                }),
            ];

            await eventRepository.save(events);

            const stats = await eventTrackingService.getUserEventStats(userId, 30);
            expect(stats).toHaveProperty('problem_view');
            expect(stats).toHaveProperty('code_submission');
            expect(stats['problem_view']).toBe(2);
            expect(stats['code_submission']).toBe(1);
        });

        it('should return empty stats for user with no events', async () => {
            const userId = 'user-no-events';

            const stats = await eventTrackingService.getUserEventStats(userId, 30);
            expect(stats).toEqual({});
        });
    });

    describe('getEventsByType', () => {
        it('should return events filtered by type and date range', async () => {
            const startDate = new Date('2023-01-01');
            const endDate = new Date('2023-12-31');

            const events = [
                eventRepository.create({
                    userId: 'user-1',
                    eventType: 'problem_solved',
                    eventData: {},
                    timestamp: new Date('2023-06-15'),
                }),
                eventRepository.create({
                    userId: 'user-2',
                    eventType: 'problem_solved',
                    eventData: {},
                    timestamp: new Date('2023-07-20'),
                }),
                eventRepository.create({
                    userId: 'user-3',
                    eventType: 'problem_view',
                    eventData: {},
                    timestamp: new Date('2023-06-15'),
                }),
            ];

            await eventRepository.save(events);

            const problemSolvedEvents = await eventTrackingService.getEventsByType(
                'problem_solved',
                startDate,
                endDate
            );

            expect(problemSolvedEvents).toHaveLength(2);
            expect(problemSolvedEvents.every(e => e.eventType === 'problem_solved')).toBe(true);
        });
    });
});