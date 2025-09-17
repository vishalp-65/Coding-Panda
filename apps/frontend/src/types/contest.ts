export interface Contest {
    id: string;
    title: string;
    description: string;
    startTime: string;
    endTime: string;
    duration: number; // in minutes
    participants: number;
    maxParticipants?: number;
    status: 'upcoming' | 'live' | 'ended';
    difficulty: 'easy' | 'medium' | 'hard';
    problems: ContestProblem[];
    rules: ContestRules;
    prizes?: Prize[];
    createdBy: string;
    createdAt: string;
    updatedAt: string;
}

export interface ContestProblem {
    id: string;
    title: string;
    difficulty: 'easy' | 'medium' | 'hard';
    points: number;
    order: number;
}

export interface ContestRules {
    allowedLanguages: string[];
    penaltyPerWrongSubmission: number;
    maxSubmissionsPerProblem: number;
    showLeaderboardDuringContest: boolean;
    freezeLeaderboard?: number; // minutes before end
}

export interface Prize {
    rank: number;
    description: string;
    value?: string;
}

export interface ContestParticipant {
    id: string;
    userId: string;
    username: string;
    avatar?: string;
    joinedAt: string;
    submissions: ContestSubmission[];
    totalScore: number;
    penalty: number;
    rank: number;
    lastSubmissionTime?: string;
}

export interface ContestSubmission {
    id: string;
    problemId: string;
    userId: string;
    code: string;
    language: string;
    status: 'accepted' | 'wrong_answer' | 'time_limit_exceeded' | 'memory_limit_exceeded' | 'runtime_error' | 'compilation_error';
    score: number;
    submittedAt: string;
    executionTime?: number;
    memoryUsed?: number;
    testCasesPassed?: number;
    totalTestCases?: number;
}

export interface Leaderboard {
    contestId: string;
    participants: ContestParticipant[];
    lastUpdated: string;
    isFrozen: boolean;
}

export interface ContestAnalytics {
    contestId: string;
    totalParticipants: number;
    totalSubmissions: number;
    problemStats: ProblemStats[];
    participantDistribution: {
        byCountry: Record<string, number>;
        byExperience: Record<string, number>;
    };
    submissionTrends: {
        timestamp: string;
        submissions: number;
    }[];
}

export interface ProblemStats {
    problemId: string;
    title: string;
    totalSubmissions: number;
    acceptedSubmissions: number;
    acceptanceRate: number;
    averageAttempts: number;
    firstSolveTime?: number; // minutes from contest start
}