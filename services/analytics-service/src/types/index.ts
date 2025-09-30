export interface AnalyticsEvent {
    id: string;
    userId: string;
    eventType: string;
    eventData: Record<string, any>;
    timestamp: Date;
    sessionId?: string;
    userAgent?: string;
    ipAddress?: string;
}

export interface UserBehaviorPattern {
    userId: string;
    patterns: {
        sessionDuration: number;
        problemsSolved: number;
        preferredDifficulty: string;
        activeHours: number[];
        streakDays: number;
        dropoffPoints: string[];
    };
    lastUpdated: Date;
}

export interface PerformanceMetrics {
    userId: string;
    problemId: string;
    metrics: {
        solutionTime: number;
        attempts: number;
        hintsUsed: number;
        codeQuality: number;
        efficiency: number;
    };
    timestamp: Date;
}

export interface RecommendationRequest {
    userId: string;
    type: 'problem' | 'learning_path' | 'contest';
    context?: Record<string, any>;
    limit?: number;
}

export interface Recommendation {
    id: string;
    type: string;
    score: number;
    reason: string;
    metadata: Record<string, any>;
}

export interface ABTestConfig {
    id: string;
    name: string;
    description: string;
    variants: ABTestVariant[];
    trafficAllocation: number;
    startDate: Date;
    endDate: Date;
    status: string;
    targetMetric: string;
}

export interface ABTestVariant {
    id: string;
    name: string;
    allocation: number;
    config: Record<string, any>;
}

export interface ABTestAssignment {
    userId: string;
    testId: string;
    variantId: string;
    assignedAt: Date;
}

export interface EngagementMetrics {
    userId: string;
    date: Date;
    metrics: {
        sessionCount: number;
        totalTime: number;
        problemsAttempted: number;
        problemsSolved: number;
        streakDays: number;
        lastActive: Date;
    };
}

export interface RetentionAnalysis {
    cohort: string;
    period: number;
    retainedUsers: number;
    totalUsers: number;
    retentionRate: number;
}

export interface DashboardData {
    overview: {
        totalUsers: number;
        activeUsers: number;
        totalProblems: number;
        totalSubmissions: number;
    };
    engagement: {
        dailyActiveUsers: number[];
        averageSessionTime: number;
        problemCompletionRate: number;
    };
    performance: {
        averageResponseTime: number;
        errorRate: number;
        throughput: number;
    };
    retention: RetentionAnalysis[];
}