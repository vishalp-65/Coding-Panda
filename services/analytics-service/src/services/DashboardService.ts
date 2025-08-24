import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { redis } from '../config/redis';
import { AnalyticsEvent } from '../entities/AnalyticsEvent';
import { EngagementMetrics } from '../entities/EngagementMetrics';
import { UserBehaviorPattern } from '../entities/UserBehaviorPattern';
import { DashboardData, RetentionAnalysis } from '../types';
import * as ss from 'simple-statistics';

export class DashboardService {
    private eventRepository: Repository<AnalyticsEvent>;
    private engagementRepository: Repository<EngagementMetrics>;
    private behaviorRepository: Repository<UserBehaviorPattern>;

    constructor() {
        this.eventRepository = AppDataSource.getRepository(AnalyticsEvent);
        this.engagementRepository = AppDataSource.getRepository(EngagementMetrics);
        this.behaviorRepository = AppDataSource.getRepository(UserBehaviorPattern);
    }

    async getDashboardData(timeRange: string = '30d'): Promise<DashboardData> {
        try {
            const cacheKey = `dashboard:${timeRange}`;
            const cached = await redis.get(cacheKey);

            if (cached) {
                return JSON.parse(cached);
            }

            const { startDate, endDate } = this.getDateRange(timeRange);

            const [overview, engagement, performance, retention] = await Promise.all([
                this.getOverviewMetrics(startDate, endDate),
                this.getEngagementMetrics(startDate, endDate),
                this.getPerformanceMetrics(startDate, endDate),
                this.getRetentionAnalysis(startDate, endDate),
            ]);

            const dashboardData: DashboardData = {
                overview,
                engagement,
                performance,
                retention,
            };

            // Cache for 15 minutes
            await redis.setex(cacheKey, 900, JSON.stringify(dashboardData));

            return dashboardData;
        } catch (error) {
            console.error('Error getting dashboard data:', error);
            throw error;
        }
    }

    async getRealtimeMetrics(): Promise<any> {
        try {
            const now = new Date();
            const today = now.toISOString().split('T')[0];
            const currentHour = now.getHours();

            // Get real-time metrics from Redis
            const [
                activeUsers,
                todayEvents,
                currentHourEvents,
                onlineUsers,
            ] = await Promise.all([
                redis.scard(`dau:${today}`),
                this.getTodayEventCounts(),
                this.getCurrentHourEventCounts(today, currentHour),
                this.getOnlineUserCount(),
            ]);

            return {
                activeUsersToday: activeUsers,
                eventsToday: todayEvents,
                eventsThisHour: currentHourEvents,
                onlineUsers,
                timestamp: now,
            };
        } catch (error) {
            console.error('Error getting realtime metrics:', error);
            throw error;
        }
    }

    async getUserEngagementTrends(userId?: string, days: number = 30): Promise<any> {
        try {
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);

            let query = this.engagementRepository
                .createQueryBuilder('engagement')
                .where('engagement.date >= :startDate', { startDate })
                .andWhere('engagement.date <= :endDate', { endDate });

            if (userId) {
                query = query.andWhere('engagement.userId = :userId', { userId });
            }

            const engagementData = await query
                .orderBy('engagement.date', 'ASC')
                .getMany();

            // Group by date and calculate aggregates
            const dailyMetrics: Record<string, any> = {};

            for (const engagement of engagementData) {
                const dateKey = engagement.date.toISOString().split('T')[0];

                if (!dailyMetrics[dateKey]) {
                    dailyMetrics[dateKey] = {
                        date: dateKey,
                        totalUsers: 0,
                        totalSessions: 0,
                        totalTime: 0,
                        totalProblemsAttempted: 0,
                        totalProblemsSolved: 0,
                        avgStreakDays: 0,
                    };
                }

                const metrics = dailyMetrics[dateKey];
                metrics.totalUsers += 1;
                metrics.totalSessions += engagement.metrics.sessionCount;
                metrics.totalTime += engagement.metrics.totalTime;
                metrics.totalProblemsAttempted += engagement.metrics.problemsAttempted;
                metrics.totalProblemsSolved += engagement.metrics.problemsSolved;
                metrics.avgStreakDays += engagement.metrics.streakDays;
            }

            // Calculate averages
            Object.values(dailyMetrics).forEach((day: any) => {
                day.avgSessionsPerUser = day.totalUsers > 0 ? day.totalSessions / day.totalUsers : 0;
                day.avgTimePerUser = day.totalUsers > 0 ? day.totalTime / day.totalUsers : 0;
                day.avgProblemsAttemptedPerUser = day.totalUsers > 0 ? day.totalProblemsAttempted / day.totalUsers : 0;
                day.avgProblemsSolvedPerUser = day.totalUsers > 0 ? day.totalProblemsSolved / day.totalUsers : 0;
                day.avgStreakDays = day.totalUsers > 0 ? day.avgStreakDays / day.totalUsers : 0;
            });

            return Object.values(dailyMetrics);
        } catch (error) {
            console.error('Error getting user engagement trends:', error);
            throw error;
        }
    }

    async getTopPerformers(metric: string = 'problemsSolved', limit: number = 10): Promise<any[]> {
        try {
            const cacheKey = `top_performers:${metric}:${limit}`;
            const cached = await redis.get(cacheKey);

            if (cached) {
                return JSON.parse(cached);
            }

            // Get recent engagement metrics
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 30);

            const engagementData = await this.engagementRepository
                .createQueryBuilder('engagement')
                .where('engagement.date >= :startDate', { startDate })
                .andWhere('engagement.date <= :endDate', { endDate })
                .getMany();

            // Aggregate by user
            const userMetrics: Record<string, any> = {};

            for (const engagement of engagementData) {
                const userId = engagement.userId;

                if (!userMetrics[userId]) {
                    userMetrics[userId] = {
                        userId,
                        totalSessions: 0,
                        totalTime: 0,
                        totalProblemsAttempted: 0,
                        totalProblemsSolved: 0,
                        maxStreakDays: 0,
                    };
                }

                const user = userMetrics[userId];
                user.totalSessions += engagement.metrics.sessionCount;
                user.totalTime += engagement.metrics.totalTime;
                user.totalProblemsAttempted += engagement.metrics.problemsAttempted;
                user.totalProblemsSolved += engagement.metrics.problemsSolved;
                user.maxStreakDays = Math.max(user.maxStreakDays, engagement.metrics.streakDays);
            }

            // Sort by specified metric
            const sortedUsers = Object.values(userMetrics)
                .sort((a: any, b: any) => {
                    const aValue = a[metric] || 0;
                    const bValue = b[metric] || 0;
                    return bValue - aValue;
                })
                .slice(0, limit);

            // Cache for 1 hour
            await redis.setex(cacheKey, 3600, JSON.stringify(sortedUsers));

            return sortedUsers;
        } catch (error) {
            console.error('Error getting top performers:', error);
            throw error;
        }
    }

    async getSystemHealthMetrics(): Promise<any> {
        try {
            const now = new Date();
            const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

            // Get error events from last hour
            const errorEvents = await this.eventRepository.count({
                where: {
                    eventType: 'error',
                    timestamp: {
                        $gte: oneHourAgo,
                    } as any,
                },
            });

            // Get total events from last hour
            const totalEvents = await this.eventRepository.count({
                where: {
                    timestamp: {
                        $gte: oneHourAgo,
                    } as any,
                },
            });

            const errorRate = totalEvents > 0 ? (errorEvents / totalEvents) * 100 : 0;

            // Get response time metrics from Redis (would be populated by API gateway)
            const responseTimeKey = 'metrics:response_time:avg';
            const avgResponseTime = await redis.get(responseTimeKey);

            // Get throughput (requests per minute)
            const throughputKey = 'metrics:throughput:rpm';
            const throughput = await redis.get(throughputKey);

            return {
                errorRate,
                averageResponseTime: parseFloat(avgResponseTime || '0'),
                throughput: parseInt(throughput || '0'),
                totalEvents,
                errorEvents,
                timestamp: now,
            };
        } catch (error) {
            console.error('Error getting system health metrics:', error);
            throw error;
        }
    }

    private async getOverviewMetrics(startDate: Date, endDate: Date): Promise<any> {
        const [totalUsers, activeUsers, totalProblems, totalSubmissions] = await Promise.all([
            this.getTotalUsers(),
            this.getActiveUsers(startDate, endDate),
            this.getTotalProblems(),
            this.getTotalSubmissions(startDate, endDate),
        ]);

        return {
            totalUsers,
            activeUsers,
            totalProblems,
            totalSubmissions,
        };
    }

    private async getEngagementMetrics(startDate: Date, endDate: Date): Promise<any> {
        const engagementData = await this.engagementRepository
            .createQueryBuilder('engagement')
            .where('engagement.date >= :startDate', { startDate })
            .andWhere('engagement.date <= :endDate', { endDate })
            .getMany();

        const dailyActiveUsers = this.calculateDailyActiveUsers(engagementData);
        const averageSessionTime = this.calculateAverageSessionTime(engagementData);
        const problemCompletionRate = this.calculateProblemCompletionRate(engagementData);

        return {
            dailyActiveUsers,
            averageSessionTime,
            problemCompletionRate,
        };
    }

    private async getPerformanceMetrics(startDate: Date, endDate: Date): Promise<any> {
        // These would typically come from application monitoring
        return {
            averageResponseTime: 150, // ms
            errorRate: 0.5, // %
            throughput: 1200, // requests per minute
        };
    }

    private async getRetentionAnalysis(startDate: Date, endDate: Date): Promise<RetentionAnalysis[]> {
        // Simplified retention analysis
        const cohorts = await this.calculateCohortRetention(startDate, endDate);
        return cohorts;
    }

    private getDateRange(timeRange: string): { startDate: Date; endDate: Date } {
        const endDate = new Date();
        const startDate = new Date();

        switch (timeRange) {
            case '7d':
                startDate.setDate(startDate.getDate() - 7);
                break;
            case '30d':
                startDate.setDate(startDate.getDate() - 30);
                break;
            case '90d':
                startDate.setDate(startDate.getDate() - 90);
                break;
            default:
                startDate.setDate(startDate.getDate() - 30);
        }

        return { startDate, endDate };
    }

    private async getTotalUsers(): Promise<number> {
        // This would query the user service or user table
        return 10000; // Mock value
    }

    private async getActiveUsers(startDate: Date, endDate: Date): Promise<number> {
        return await this.engagementRepository
            .createQueryBuilder('engagement')
            .select('COUNT(DISTINCT engagement.userId)', 'count')
            .where('engagement.date >= :startDate', { startDate })
            .andWhere('engagement.date <= :endDate', { endDate })
            .getRawOne()
            .then(result => parseInt(result.count));
    }

    private async getTotalProblems(): Promise<number> {
        // This would query the problem service
        return 2500; // Mock value
    }

    private async getTotalSubmissions(startDate: Date, endDate: Date): Promise<number> {
        return await this.eventRepository.count({
            where: {
                eventType: 'code_submission',
                timestamp: {
                    $gte: startDate,
                    $lte: endDate,
                } as any,
            },
        });
    }

    private calculateDailyActiveUsers(engagementData: any[]): number[] {
        const dailyUsers: Record<string, Set<string>> = {};

        for (const engagement of engagementData) {
            const dateKey = engagement.date.toISOString().split('T')[0];
            if (!dailyUsers[dateKey]) {
                dailyUsers[dateKey] = new Set();
            }
            dailyUsers[dateKey].add(engagement.userId);
        }

        return Object.values(dailyUsers).map(userSet => userSet.size);
    }

    private calculateAverageSessionTime(engagementData: any[]): number {
        if (engagementData.length === 0) return 0;

        const totalTime = engagementData.reduce((sum, engagement) =>
            sum + engagement.metrics.totalTime, 0
        );
        const totalSessions = engagementData.reduce((sum, engagement) =>
            sum + engagement.metrics.sessionCount, 0
        );

        return totalSessions > 0 ? totalTime / totalSessions : 0;
    }

    private calculateProblemCompletionRate(engagementData: any[]): number {
        if (engagementData.length === 0) return 0;

        const totalAttempted = engagementData.reduce((sum, engagement) =>
            sum + engagement.metrics.problemsAttempted, 0
        );
        const totalSolved = engagementData.reduce((sum, engagement) =>
            sum + engagement.metrics.problemsSolved, 0
        );

        return totalAttempted > 0 ? (totalSolved / totalAttempted) * 100 : 0;
    }

    private async calculateCohortRetention(startDate: Date, endDate: Date): Promise<RetentionAnalysis[]> {
        // Simplified cohort retention calculation
        const cohorts: RetentionAnalysis[] = [];

        // Group users by registration week
        const weeklyData = await this.engagementRepository
            .createQueryBuilder('engagement')
            .select('DATE_TRUNC(\'week\', engagement.date)', 'week')
            .addSelect('COUNT(DISTINCT engagement.userId)', 'users')
            .where('engagement.date >= :startDate', { startDate })
            .andWhere('engagement.date <= :endDate', { endDate })
            .groupBy('DATE_TRUNC(\'week\', engagement.date)')
            .orderBy('week', 'ASC')
            .getRawMany();

        for (let i = 0; i < weeklyData.length; i++) {
            const week = weeklyData[i];
            cohorts.push({
                cohort: `Week ${i + 1}`,
                period: i,
                retainedUsers: parseInt(week.users),
                totalUsers: parseInt(week.users), // Simplified
                retentionRate: 100, // Simplified
            });
        }

        return cohorts;
    }

    private async getTodayEventCounts(): Promise<number> {
        const today = new Date().toISOString().split('T')[0];
        const keys = await redis.keys(`events:*:${today}`);

        let total = 0;
        for (const key of keys) {
            const count = await redis.get(key);
            total += parseInt(count || '0');
        }

        return total;
    }

    private async getCurrentHourEventCounts(today: string, hour: number): Promise<number> {
        const hourKey = `events:current_hour:${today}:${hour}`;
        const count = await redis.get(hourKey);
        return parseInt(count || '0');
    }

    private async getOnlineUserCount(): Promise<number> {
        // Count active sessions in last 5 minutes
        const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
        const sessionKeys = await redis.keys('session:*:last_activity');

        let onlineCount = 0;
        for (const key of sessionKeys) {
            const lastActivity = await redis.get(key);
            if (lastActivity && parseInt(lastActivity) > fiveMinutesAgo) {
                onlineCount++;
            }
        }

        return onlineCount;
    }
}