export interface Contest {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  registrationStart: Date;
  registrationEnd?: Date;
  maxParticipants?: number;
  problemIds: string[];
  rules: Record<string, any>;
  scoringType: ScoringType;
  status: ContestStatus;
  isPublic: boolean;
  createdBy: string;
  prizePool: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContestParticipant {
  id: string;
  contestId: string;
  userId: string;
  username: string;
  registeredAt: Date;
  status: ParticipantStatus;
  teamName?: string;
}

export interface ContestSubmission {
  id: string;
  contestId: string;
  participantId: string;
  problemId: string;
  code: string;
  language: string;
  status: SubmissionStatus;
  score: number;
  executionTime?: number;
  memoryUsed?: number;
  testCasesPassed: number;
  totalTestCases: number;
  submittedAt: Date;
  judgedAt?: Date;
}

export interface ContestRanking {
  id: string;
  contestId: string;
  participantId: string;
  rank: number;
  totalScore: number;
  problemsSolved: number;
  totalPenalty: number;
  lastSubmissionTime?: Date;
  problemScores: Record<string, ProblemScore>;
  updatedAt: Date;
}

export interface ProblemScore {
  score: number;
  attempts: number;
  solvedAt?: Date;
}

export interface ContestAnalytics {
  id: string;
  contestId: string;
  totalParticipants: number;
  totalSubmissions: number;
  averageScore: number;
  problemStatistics: Record<string, ProblemStatistics>;
  languageDistribution: Record<string, number>;
  submissionTimeline: Record<string, number>;
  calculatedAt: Date;
}

export interface ProblemStatistics {
  totalSubmissions: number;
  acceptedSubmissions: number;
  acceptanceRate: number;
  averageScore: number;
  averageAttempts: number;
}

export interface Leaderboard {
  contestId: string;
  rankings: LeaderboardEntry[];
  totalParticipants: number;
  lastUpdated: Date;
}

export interface LeaderboardEntry {
  rank: number;
  participant: {
    id: string;
    userId: string;
    username: string;
    teamName?: string;
  };
  totalScore: number;
  problemsSolved: number;
  totalPenalty: number;
  lastSubmissionTime?: Date;
  problemScores: Record<string, ProblemScore>;
}

// Enums
export enum ContestStatus {
  DRAFT = 'draft',
  UPCOMING = 'upcoming',
  ACTIVE = 'active',
  ENDED = 'ended',
  CANCELLED = 'cancelled'
}

export enum ParticipantStatus {
  REGISTERED = 'registered',
  PARTICIPATING = 'participating',
  DISQUALIFIED = 'disqualified'
}

export enum SubmissionStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  WRONG_ANSWER = 'wrong_answer',
  TIME_LIMIT = 'time_limit',
  MEMORY_LIMIT = 'memory_limit',
  RUNTIME_ERROR = 'runtime_error',
  COMPILE_ERROR = 'compile_error'
}

export enum ScoringType {
  STANDARD = 'standard',
  ICPC = 'icpc',
  IOI = 'ioi'
}

// Request/Response DTOs
export interface CreateContestRequest {
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  registrationEnd?: string;
  maxParticipants?: number;
  problemIds: string[];
  rules?: Record<string, any>;
  scoringType?: ScoringType;
  isPublic?: boolean;
  prizePool?: number;
}

export interface UpdateContestRequest {
  title?: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  registrationEnd?: string;
  maxParticipants?: number;
  problemIds?: string[];
  rules?: Record<string, any>;
  scoringType?: ScoringType;
  isPublic?: boolean;
  prizePool?: number;
}

export interface ContestRegistrationRequest {
  teamName?: string;
}

export interface SubmitSolutionRequest {
  problemId: string;
  code: string;
  language: string;
}

export interface ContestSearchQuery {
  status?: ContestStatus;
  isPublic?: boolean;
  createdBy?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  sortBy?: 'startTime' | 'createdAt' | 'title';
  sortOrder?: 'asc' | 'desc';
}

export interface ContestListResponse {
  contests: Contest[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}