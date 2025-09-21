export interface Contest {
  id: string;
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  problems: string[]; // Problem IDs
  rules: ContestRules;
  status: ContestStatus;
  participants: ContestParticipant[];
  prizes?: Prize[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export type ContestStatus =
  | 'draft'
  | 'scheduled'
  | 'running'
  | 'finished'
  | 'cancelled';

export interface ContestRules {
  maxParticipants?: number;
  allowLateSubmissions: boolean;
  penaltyPerWrongSubmission: number; // in minutes
  freezeLeaderboard?: boolean;
  freezeTime?: number; // minutes before end
  allowedLanguages: string[];
  isPublic: boolean;
  requireRegistration: boolean;
}

export interface ContestParticipant {
  userId: string;
  username: string;
  registeredAt: Date;
  score: number;
  penalty: number; // in minutes
  rank: number;
  submissions: ContestSubmission[];
}

export interface ContestSubmission {
  problemId: string;
  submissionId: string;
  submittedAt: Date;
  status: string;
  score: number;
  penalty: number;
}

export interface Prize {
  rank: number;
  title: string;
  description?: string;
  value?: string;
}

export interface Leaderboard {
  contestId: string;
  participants: LeaderboardEntry[];
  lastUpdated: Date;
  isFrozen: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatar?: string;
  score: number;
  penalty: number;
  problemsAttempted: number;
  problemsSolved: number;
  lastSubmissionTime: Date;
}

export interface CreateContestRequest {
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  problems: string[];
  rules: ContestRules;
  prizes?: Prize[];
}

export interface UpdateContestRequest {
  title?: string;
  description?: string;
  startTime?: Date;
  endTime?: Date;
  problems?: string[];
  rules?: Partial<ContestRules>;
  prizes?: Prize[];
}

export interface ContestRegistrationRequest {
  contestId: string;
  userId: string;
}
