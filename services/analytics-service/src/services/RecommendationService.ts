import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { redis } from '../config/redis';
import { UserBehaviorPattern } from '../entities/UserBehaviorPattern';
import { PerformanceMetrics } from '../entities/PerformanceMetrics';
import { BehaviorAnalysisService } from './BehaviorAnalysisService';
import { RecommendationRequest, Recommendation } from '../types';
import { Matrix } from 'ml-matrix';
import * as ss from 'simple-statistics';

export class RecommendationService {
    private behaviorRepository: Repository<UserBehaviorPattern>;
    private metricsRepository: Repository<PerformanceMetrics>;
    private behaviorService: BehaviorAnalysisService;

    constructor() {
        this.behaviorRepository = AppDataSource.getRepository(UserBehaviorPattern);
        this.metricsRepository = AppDataSource.getRepository(PerformanceMetrics);
        this.behaviorService = new BehaviorAnalysisService();
    }

    async generateRecommendations(request: RecommendationRequest): Promise<Recommendation[]> {
        try {
            const cacheKey = `recommendations:${request.userId}:${request.type}`;
            const cached = await redis.get(cacheKey);

            if (cached) {
                return JSON.parse(cached);
            }

            let recommendations: Recommendation[] = [];

            switch (request.type) {
                case 'problem':
                    recommendations = await this.generateProblemRecommendations(request);
                    break;
                case 'learning_path':
                    recommendations = await this.generateLearningPathRecommendations(request);
                    break;
                case 'contest':
                    recommendations = await this.generateContestRecommendations(request);
                    break;
            }

            // Cache for 30 minutes
            await redis.setex(cacheKey, 1800, JSON.stringify(recommendations));

            return recommendations.slice(0, request.limit || 10);
        } catch (error) {
            console.error('Error generating recommendations:', error);
            throw error;
        }
    }

    private async generateProblemRecommendations(request: RecommendationRequest): Promise<Recommendation[]> {
        const userBehavior = await this.behaviorService.analyzeUserBehavior(request.userId);
        const userMetrics = await this.getUserPerformanceMetrics(request.userId);

        // Get similar users using collaborative filtering
        const similarUsers = await this.findSimilarUsers(request.userId);

        const recommendations: Recommendation[] = [];

        // Content-based recommendations
        const contentBased = await this.getContentBasedRecommendations(userBehavior, userMetrics);
        recommendations.push(...contentBased);

        // Collaborative filtering recommendations
        const collaborative = await this.getCollaborativeRecommendations(request.userId, similarUsers);
        recommendations.push(...collaborative);

        // Difficulty progression recommendations
        const progression = await this.getDifficultyProgressionRecommendations(userBehavior, userMetrics);
        recommendations.push(...progression);

        // Sort by score and remove duplicates
        const uniqueRecommendations = this.deduplicateRecommendations(recommendations);
        return uniqueRecommendations.sort((a, b) => b.score - a.score);
    }

    private async generateLearningPathRecommendations(request: RecommendationRequest): Promise<Recommendation[]> {
        const userBehavior = await this.behaviorService.analyzeUserBehavior(request.userId);
        const weakAreas = await this.identifyWeakAreas(request.userId);

        const recommendations: Recommendation[] = [];

        // Weak area improvement paths
        for (const area of weakAreas) {
            recommendations.push({
                id: `learning_path_${area.topic}`,
                type: 'learning_path',
                score: area.priority * 0.8,
                reason: `Improve ${area.topic} skills based on performance analysis`,
                metadata: {
                    topic: area.topic,
                    difficulty: area.suggestedDifficulty,
                    estimatedTime: area.estimatedTime,
                    problems: area.recommendedProblems,
                },
            });
        }

        // Skill advancement paths
        const advancementPaths = await this.getSkillAdvancementPaths(userBehavior);
        recommendations.push(...advancementPaths);

        return recommendations.sort((a, b) => b.score - a.score);
    }

    private async generateContestRecommendations(request: RecommendationRequest): Promise<Recommendation[]> {
        const userBehavior = await this.behaviorService.analyzeUserBehavior(request.userId);
        const engagementScore = await this.behaviorService.calculateEngagementScore(request.userId);

        const recommendations: Recommendation[] = [];

        // Upcoming contests based on skill level
        const skillBasedContests = await this.getSkillBasedContests(userBehavior);
        recommendations.push(...skillBasedContests);

        // Time-based contest recommendations
        if (userBehavior.patterns.activeHours.length > 0) {
            const timeBasedContests = await this.getTimeBasedContests(userBehavior.patterns.activeHours);
            recommendations.push(...timeBasedContests);
        }

        // Engagement-based recommendations
        if (engagementScore > 70) {
            recommendations.push({
                id: 'competitive_contests',
                type: 'contest',
                score: 0.9,
                reason: 'High engagement score suggests readiness for competitive contests',
                metadata: {
                    contestType: 'competitive',
                    difficulty: 'medium-hard',
                },
            });
        }

        return recommendations.sort((a, b) => b.score - a.score);
    }

    private async findSimilarUsers(userId: string, limit: number = 10): Promise<string[]> {
        try {
            // Get all user behavior patterns
            const allPatterns = await this.behaviorRepository.find();
            const targetPattern = allPatterns.find(p => p.userId === userId);

            if (!targetPattern) return [];

            // Calculate similarity scores
            const similarities: Array<{ userId: string; score: number }> = [];

            for (const pattern of allPatterns) {
                if (pattern.userId === userId) continue;

                const similarity = this.calculateUserSimilarity(targetPattern.patterns, pattern.patterns);
                similarities.push({ userId: pattern.userId, score: similarity });
            }

            // Return top similar users
            return similarities
                .sort((a, b) => b.score - a.score)
                .slice(0, limit)
                .map(s => s.userId);
        } catch (error) {
            console.error('Error finding similar users:', error);
            return [];
        }
    }

    private calculateUserSimilarity(pattern1: any, pattern2: any): number {
        let similarity = 0;
        let factors = 0;

        // Session duration similarity
        const sessionSim = 1 - Math.abs(pattern1.sessionDuration - pattern2.sessionDuration) /
            Math.max(pattern1.sessionDuration, pattern2.sessionDuration, 1);
        similarity += sessionSim * 0.3;
        factors += 0.3;

        // Preferred difficulty similarity
        if (pattern1.preferredDifficulty === pattern2.preferredDifficulty) {
            similarity += 0.2;
        }
        factors += 0.2;

        // Active hours overlap
        const hoursOverlap = pattern1.activeHours.filter((h: number) =>
            pattern2.activeHours.includes(h)
        ).length;
        const hoursUnion = [...new Set([...pattern1.activeHours, ...pattern2.activeHours])].length;
        const hoursSim = hoursOverlap / Math.max(hoursUnion, 1);
        similarity += hoursSim * 0.3;
        factors += 0.3;

        // Problems solved similarity
        const problemsSim = 1 - Math.abs(pattern1.problemsSolved - pattern2.problemsSolved) /
            Math.max(pattern1.problemsSolved, pattern2.problemsSolved, 1);
        similarity += problemsSim * 0.2;
        factors += 0.2;

        return similarity / factors;
    }

    private async getContentBasedRecommendations(
        userBehavior: any,
        userMetrics: any[]
    ): Promise<Recommendation[]> {
        const recommendations: Recommendation[] = [];

        // Recommend problems based on preferred difficulty and topics
        const preferredDifficulty = userBehavior.patterns.preferredDifficulty;
        const solvedProblems = userMetrics.map(m => m.problemId);

        // Mock problem recommendations (in real implementation, would query problem service)
        const mockProblems = [
            { id: 'prob1', difficulty: preferredDifficulty, topics: ['arrays', 'sorting'] },
            { id: 'prob2', difficulty: preferredDifficulty, topics: ['dynamic-programming'] },
            { id: 'prob3', difficulty: preferredDifficulty, topics: ['graphs', 'bfs'] },
        ];

        for (const problem of mockProblems) {
            if (!solvedProblems.includes(problem.id)) {
                recommendations.push({
                    id: problem.id,
                    type: 'problem',
                    score: 0.8,
                    reason: `Matches your preferred difficulty (${preferredDifficulty}) and interests`,
                    metadata: {
                        difficulty: problem.difficulty,
                        topics: problem.topics,
                    },
                });
            }
        }

        return recommendations;
    }

    private async getCollaborativeRecommendations(
        userId: string,
        similarUsers: string[]
    ): Promise<Recommendation[]> {
        const recommendations: Recommendation[] = [];

        // Get problems solved by similar users but not by current user
        const userMetrics = await this.getUserPerformanceMetrics(userId);
        const userSolvedProblems = new Set(userMetrics.map(m => m.problemId));

        for (const similarUserId of similarUsers) {
            const similarUserMetrics = await this.getUserPerformanceMetrics(similarUserId);

            for (const metric of similarUserMetrics) {
                if (!userSolvedProblems.has(metric.problemId)) {
                    recommendations.push({
                        id: metric.problemId,
                        type: 'problem',
                        score: 0.7,
                        reason: 'Recommended based on users with similar learning patterns',
                        metadata: {
                            source: 'collaborative_filtering',
                            similarUserId,
                        },
                    });
                }
            }
        }

        return recommendations;
    }

    private async getDifficultyProgressionRecommendations(
        userBehavior: any,
        userMetrics: any[]
    ): Promise<Recommendation[]> {
        const recommendations: Recommendation[] = [];

        // Analyze recent performance to suggest difficulty progression
        const recentMetrics = userMetrics
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, 10);

        if (recentMetrics.length > 0) {
            const avgQuality = ss.mean(recentMetrics.map(m => m.metrics.codeQuality));
            const avgEfficiency = ss.mean(recentMetrics.map(m => m.metrics.efficiency));

            if (avgQuality > 0.8 && avgEfficiency > 0.7) {
                const nextDifficulty = this.getNextDifficulty(userBehavior.patterns.preferredDifficulty);

                recommendations.push({
                    id: `difficulty_progression_${nextDifficulty}`,
                    type: 'problem',
                    score: 0.9,
                    reason: `Ready to advance to ${nextDifficulty} difficulty based on recent performance`,
                    metadata: {
                        difficulty: nextDifficulty,
                        source: 'difficulty_progression',
                    },
                });
            }
        }

        return recommendations;
    }

    private async identifyWeakAreas(userId: string): Promise<any[]> {
        const userMetrics = await this.getUserPerformanceMetrics(userId);

        // Group metrics by topic/category (mock implementation)
        const topicPerformance: Record<string, number[]> = {};

        for (const metric of userMetrics) {
            // In real implementation, would get problem topics from problem service
            const topics = ['arrays', 'dynamic-programming', 'graphs']; // Mock topics

            for (const topic of topics) {
                if (!topicPerformance[topic]) {
                    topicPerformance[topic] = [];
                }
                topicPerformance[topic].push(metric.metrics.codeQuality);
            }
        }

        const weakAreas = [];
        for (const [topic, scores] of Object.entries(topicPerformance)) {
            const avgScore = ss.mean(scores);
            if (avgScore < 0.6) {
                weakAreas.push({
                    topic,
                    avgScore,
                    priority: 1 - avgScore,
                    suggestedDifficulty: 'easy',
                    estimatedTime: '2-3 weeks',
                    recommendedProblems: [`${topic}_practice_1`, `${topic}_practice_2`],
                });
            }
        }

        return weakAreas.sort((a, b) => b.priority - a.priority);
    }

    private async getUserPerformanceMetrics(userId: string): Promise<any[]> {
        return await this.metricsRepository.find({
            where: { userId },
            order: { timestamp: 'DESC' },
            take: 100,
        });
    }

    private getNextDifficulty(currentDifficulty: string): string {
        const difficultyOrder = ['easy', 'medium', 'hard'];
        const currentIndex = difficultyOrder.indexOf(currentDifficulty);
        return difficultyOrder[Math.min(currentIndex + 1, difficultyOrder.length - 1)];
    }

    private deduplicateRecommendations(recommendations: Recommendation[]): Recommendation[] {
        const seen = new Set();
        return recommendations.filter(rec => {
            if (seen.has(rec.id)) {
                return false;
            }
            seen.add(rec.id);
            return true;
        });
    }

    private async getSkillBasedContests(userBehavior: any): Promise<Recommendation[]> {
        // Mock implementation - would integrate with contest service
        return [
            {
                id: 'weekly_contest_1',
                type: 'contest',
                score: 0.8,
                reason: `Contest matches your ${userBehavior.patterns.preferredDifficulty} skill level`,
                metadata: {
                    contestType: 'weekly',
                    difficulty: userBehavior.patterns.preferredDifficulty,
                },
            },
        ];
    }

    private async getTimeBasedContests(activeHours: number[]): Promise<Recommendation[]> {
        // Mock implementation
        return [
            {
                id: 'evening_contest',
                type: 'contest',
                score: 0.7,
                reason: 'Contest scheduled during your most active hours',
                metadata: {
                    scheduledHour: activeHours[0],
                    contestType: 'evening',
                },
            },
        ];
    }

    private async getSkillAdvancementPaths(userBehavior: any): Promise<Recommendation[]> {
        // Mock implementation
        return [
            {
                id: 'advanced_algorithms_path',
                type: 'learning_path',
                score: 0.75,
                reason: 'Next step in your algorithmic journey',
                metadata: {
                    pathType: 'skill_advancement',
                    duration: '4-6 weeks',
                },
            },
        ];
    }
}