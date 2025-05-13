export interface Submission {
  id: string;
  userId: string;
  problemId: string;
  contestId?: string;
  code: string;
  language: ProgrammingLanguage;
  status: SubmissionStatus;
  executionTime?: number; // in milliseconds
  memoryUsed?: number; // in MB
  testResults: TestResult[];
  errorMessage?: string;
  submittedAt: Date;
  judgedAt?: Date;
}

export type ProgrammingLanguage = 'python' | 'javascript' | 'java' | 'cpp' | 'go' | 'rust';

export type SubmissionStatus = 
  | 'pending'
  | 'running'
  | 'accepted'
  | 'wrong_answer'
  | 'time_limit_exceeded'
  | 'memory_limit_exceeded'
  | 'runtime_error'
  | 'compilation_error'
  | 'system_error';

export interface TestResult {
  testCaseId: string;
  status: 'passed' | 'failed' | 'error';
  actualOutput?: string;
  expectedOutput: string;
  executionTime: number;
  memoryUsed: number;
  errorMessage?: string;
}

export interface ExecutionRequest {
  code: string;
  language: ProgrammingLanguage;
  testCases: TestCase[];
  timeLimit: number;
  memoryLimit: number;
}

export interface ExecutionResult {
  status: SubmissionStatus;
  output?: string;
  error?: string;
  executionTime: number;
  memoryUsed: number;
  testResults: TestResult[];
}

export interface SubmissionRequest {
  problemId: string;
  code: string;
  language: ProgrammingLanguage;
  contestId?: string;
}

export interface SubmissionSummary {
  id: string;
  problemTitle: string;
  language: ProgrammingLanguage;
  status: SubmissionStatus;
  executionTime?: number;
  memoryUsed?: number;
  submittedAt: Date;
}

interface TestCase {
  id: string;
  input: string;
  expectedOutput: string;
  isHidden: boolean;
}