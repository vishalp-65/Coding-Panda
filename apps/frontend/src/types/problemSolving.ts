export interface ExecutionResult {
  status: 'success' | 'error' | 'timeout' | 'memory_limit' | 'runtime_error';
  output?: string;
  error?: string;
  executionTime: number;
  memoryUsed: number;
  testResults: TestResult[];
}

export interface TestResult {
  input: string;
  expected: string;
  actual: string;
  passed: boolean;
  executionTime?: number;
  memoryUsed?: number;
}

export interface ProblemPagination {
  page: number;
  limit: number;
  totalPages: number;
  totalProblems: number;
  hasNext?: boolean;
  hasPrev?: boolean;
}

// Type for each test case
interface TestCase {
  id: string;
  input?: string;
  expectedOutput?: string;
  isHidden: boolean;
  explanation: string;
}

// Type for constraints
interface Constraints {
  timeLimit: number;
  memoryLimit: number;
  inputFormat: string;
  outputFormat: string;
  sampleInput: string;
  sampleOutput: string;
}

// Type for problem statistics
interface ProblemStatistics {
  totalSubmissions: number;
  acceptedSubmissions: number;
  acceptanceRate: number;
  averageRating: number;
  ratingCount: number;
  difficultyVotes: {
    easy: number;
    medium: number;
    hard: number;
  };
}

// Main problem type
export interface Problem {
  title: string;
  slug: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  status: 'unsolved' | 'solved' | 'attempted';
  tags: string[];
  number: number;
  frequency: number;
  isBookmarked: boolean;
  constraints: Constraints;
  testCases: TestCase[];
  statistics: ProblemStatistics;
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
  id: string;
}

export interface TemplateData {
  userEditableRegion: string;
  hiddenCode?: string;
  beforeUserCode?: string;
  afterUserCode?: string;
  functionSignature: string;
  imports: string;
  helperClasses: string;
  language: string;
  problemId: string;
  problemTitle: string;
}

export interface Submission {
  id: string;
  problemId: string;
  userId: string;
  code: string;
  language: string;
  status:
    | 'accepted'
    | 'wrong_answer'
    | 'time_limit_exceeded'
    | 'memory_limit_exceeded'
    | 'runtime_error'
    | 'compilation_error';
  executionTime?: number;
  memoryUsed?: number;
  submittedAt: string;
  testResults?: TestResult[];
}

export interface Hint {
  id: string;
  level: number;
  content: string;
  type: 'conceptual' | 'implementation' | 'optimization';
  revealed: boolean;
}

export interface AIFeedback {
  codeQuality: {
    score: number;
    suggestions: string[];
  };
  complexity: {
    time: string;
    space: string;
    analysis: string;
  };
  security: {
    issues: SecurityIssue[];
  };
  performance: {
    suggestions: string[];
    bottlenecks: string[];
  };
  explanation?: string;
}

export interface SecurityIssue {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  line?: number;
  suggestion: string;
}

export interface CodeTemplate {
  language: string;
  template: string;
}

export interface LanguageConfig {
  value: string;
  label: string;
  monacoLanguage: string;
  fileExtension: string;
}
