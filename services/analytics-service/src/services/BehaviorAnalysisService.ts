import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { redis } from '../config/redis';
import { UserBehaviorPattern } from '../entities/UserBehaviorPattern';
import { AnalyticsEvent } from '../entities/AnalyticsEvent';
import { UserBehaviorPattern as IUserBehaviorPattern } from '../types';
import * as ss from 'simple-statistics';

export class BehaviorAnalysisService {
    private behaviorRepository: Repository<UserBehaviorPattern>;
    private eventRepository: Repository<AnalyticsEvent>;

    constructor() {
        this.behaviorRepository = AppDataSource.getRepository(UserBehaviorPattern);
        this.eventRepository = AppDataSource.getRepository(AnalyticsEvent);
    }

    async analyzeUserBehavior(userId: string): Promise<IUserBehaviorPattern> {
        try {
            const cacheKey = `behavior_pattern:${userId}`;
            const cached = await redis.get(cacheKey);

            if (cached) {
                return JSON.parse(cached);
            }

            // Get user events from last 90 days
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 90);

            const events = await this.eventRepository.find({
                where: {
                    userId,
                    timestamp: {
                        $gte: startDate,
                    } as any,
                },
                order: { timestamp: 'ASC' },
            });

            const patterns = await this.calculateBehaviorPatterns(events);

            // Save to database
            let behaviorPattern = await this.behaviorRepository.findOne({
                where: { userId },
            });

            if (behaviorPattern) {
                behaviorPattern.patterns = patterns;
                behaviorPattern.lastUpdated = new Date();
            } else {
                behaviorPattern = this.behaviorRepository.create({
                    userId,
                    patterns,
                    lastUpdated: new Date(),
                });
            }

            await this.behaviorRepository.save(behaviorPattern);

            const result: IUserBehaviorPattern = {
                userId,
                patterns,
                lastUpdated: behaviorPattern.lastUpdated,
            };

            // Cache for 1 hour
            await redis.setex(cacheKey, 3600, JSON.stringify(result));

            return result;
        } catch (error) {
            console.error('Error analyzing user behavior:', error);
            throw error;
        }
    }

    async identifyDropoffPoints(userId: string): Promise<string[]> {
        try {
            const events = await this.eventRepository.find({
                where: { userId },
                order: { timestamp: 'DESC' },
                take: 1000,
            });

            const sessions = this.groupEventsBySessions(events);
            const dropoffPoints: string[] = [];

            for (const session of sessions) {
                const lastEvent = session[session.length - 1];

                // Identify common dropoff patterns
                if (lastEvent.eventType === 'problem_view' && session.length === 1) {
                    dropoffPoints.push('problem_view_without_attempt');
                } else if (lastEvent.eventType === 'code_submission_failed' &&
                    session.filter(e => e.eventType === 'code_submission_failed').length >= 3) {
                    dropoffPoints.push('multiple_failed_submissions');
                } else if (lastEvent.eventType === 'hint_requested' &&
                    session.filter(e => e.eventType === 'hint_requested').length >= 5) {
                    dropoffPoints.push('excessive_hint_usage');
                }
            }

            return [...new Set(dropoffPoints)];
        } catch (error) {
            console.error('Error identifying dropoff points:', error);
            throw error;
        }
    }

    async calculateEngagementScore(userId: string): Promise<number> {
        try {
            const behavior = await this.analyzeUserBehavior(userId);
            const patterns = behavior.patterns;

            // Calculate engagement score based on multiple factors
            let score = 0;

            // Session duration (max 25 points)
            const avgSessionMinutes = patterns.sessionDuration / 60;
            score += Math.min(25, avgSessionMinutes * 2);

            // Problems solved (max 30 points)
            score += Math.min(30, patterns.problemsSolved * 0.5);

            // Streak days (max 20 points)
            score += Math.min(20, patterns.streakDays * 2);

            // Active hours diversity (max 15 points)
            const activeHoursCount = patterns.activeHours.length;
            score += Math.min(15, activeHoursCount * 1.5);

            // Penalty for dropoff points (max -10 points)
            const dropoffPenalty = Math.min(10, patterns.dropoffPoints.length * 2);
            score -= dropoffPenalty;

            // Consistency bonus (max 10 points)
            if (patterns.streakDays >= 7) score += 5;
            if (patterns.streakDays >= 30) score += 5;

            return Math.max(0, Math.min(100, score));
        } catch (error) {
            console.error('Error calculating engagement score:', error);
            throw error;
        }
    }

    private async calculateBehaviorPatterns(events: AnalyticsEvent[]): Promise<any> {
        const sessions = this.groupEventsBySessions(events);

        // Calculate session durations
        const sessionDurations = sessions.map(session => {
            if (session.length < 2) return 0;
            const start = new Date(session[0].timestamp).getTime();
            const end = new Date(session[session.length - 1].timestamp).getTime();
            return (end - start) / 1000; // in seconds
        }).filter(duration => duration > 0);

        const avgSessionDuration = sessionDurations.length > 0
            ? ss.mean(sessionDurations)
            : 0;

        // Count problems solved
        const problemsSolved = events.filter(e =>
            e.eventType === 'problem_solved'
        ).length;

        // Determine preferred difficulty
        const difficultyEvents = events.filter(e =>
            e.eventType === 'problem_attempt' && e.eventData.difficulty
        );
        const difficultyCount: Record<string, number> = {};
        difficultyEvents.forEach(e => {
            const difficulty = e.eventData.difficulty;
            difficultyCount[difficulty] = (difficultyCount[difficulty] || 0) + 1;
        });
        const preferredDifficulty = Object.keys(difficultyCount).reduce((a, b) =>
            difficultyCount[a] > difficultyCount[b] ? a : b, 'medium'
        );

        // Calculate active hours
        const activeHours = [...new Set(events.map(e =>
            new Date(e.timestamp).getHours()
        ))];

        // Calculate streak days
        const streakDays = this.calculateStreakDays(events);

        // Identify dropoff points
        const dropoffPoints = await this.identifyDropoffPoints(events[0]?.userId || '');

        return {
            sessionDuration: avgSessionDuration,
            problemsSolved,
            preferredDifficulty,
            activeHours,
            streakDays,
            dropoffPoints,
        };
    }

    private groupEventsBySessions(events: AnalyticsEvent[]): AnalyticsEvent[][] {
        const sessions: AnalyticsEvent[][] = [];
        let currentSession: AnalyticsEvent[] = [];

        const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

        for (const event of events) {
            if (currentSession.length === 0) {
                currentSession.push(event);
            } else {
                const lastEvent = currentSession[currentSession.length - 1];
                const timeDiff = new Date(event.timestamp).getTime() -
                    new Date(lastEvent.timestamp).getTime();

                if (timeDiff > SESSION_TIMEOUT) {
                    sessions.push(currentSession);
                    currentSession = [event];
                } else {
                    currentSession.push(event);
                }
            }
        }

        if (currentSession.length > 0) {
            sessions.push(currentSession);
        }

        return sessions;
    }

    private calculateStreakDays(events: AnalyticsEvent[]): number {
        const activeDays = [...new Set(events.map(e =>
            new Date(e.timestamp).toISOString().split('T')[0]
        ))].sort();

        if (activeDays.length === 0) return 0;

        let streak = 1;
        let maxStreak = 1;

        for (let i = 1; i < activeDays.length; i++) {
            const prevDate = new Date(activeDays[i - 1]);
            const currDate = new Date(activeDays[i]);
            const dayDiff = (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);

            if (dayDiff === 1) {
                streak++;
                maxStreak = Math.max(maxStreak, streak);
            } else {
                streak = 1;
            }
        }

        return maxStreak;
    }
}