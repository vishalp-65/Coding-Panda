export interface Problem {
  id: string;
  title: string;
  slug: string;
  description: string;
  difficulty: ProblemDifficulty;
  tags: string[];
  constraints: ProblemConstraints;
  testCases: TestCase[];
  editorial?: Editorial;
  statistics: ProblemStatistics;
  createdAt: Date;
  updatedAt: Date;
}

export type ProblemDifficulty = 'easy' | 'medium' | 'hard';

export interface ProblemConstraints {
  timeLimit: number; // in milliseconds
  memoryLimit: number; // in MB
  inputFormat: string;
  outputFormat: string;
  sampleInput?: string;
  sampleOutput?: string;
}

export interface TestCase {
  id: string;
  input: string;
  expectedOutput: string;
  isHidden: boolean;
  explanation?: string;
}

export interface Editorial {
  content: string;
  solutions: Solution[];
  hints: string[];
  timeComplexity: string;
  spaceComplexity: string;
  relatedTopics: string[];
}

export interface Solution {
  language: string;
  code: string;
  explanation: string;
  author: string;
  votes: number;
}

export interface ProblemStatistics {
  totalSubmissions: number;
  acceptedSubmissions: number;
  acceptanceRate: number;
  averageRating: number;
  ratingCount: number;
  difficultyVotes: Record<ProblemDifficulty, number>;
}

export interface CreateProblemRequest {
  title: string;
  description: string;
  difficulty: ProblemDifficulty;
  tags: string[];
  constraints: ProblemConstraints;
  testCases: Omit<TestCase, 'id'>[];
}

export interface UpdateProblemRequest {
  title?: string;
  description?: string;
  difficulty?: ProblemDifficulty;
  tags?: string[];
  constraints?: ProblemConstraints;
}

export interface ProblemSearchCriteria {
  query?: string;
  difficulty?: ProblemDifficulty[];
  tags?: string[];
  status?: 'solved' | 'attempted' | 'unsolved';
  sortBy?: 'title' | 'difficulty' | 'acceptance_rate' | 'created_at';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}