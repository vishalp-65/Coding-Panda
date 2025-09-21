export interface CodeAnalysisRequest {
  code: string;
  language: string;
  problemContext?: string;
  userLevel: string;
}

export interface CodeAnalysisResult {
  qualityScore: number;
  suggestions: CodeSuggestion[];
  complexityMetrics: ComplexityMetrics;
  securityIssues: SecurityIssue[];
  performanceInsights: PerformanceInsight[];
  explanation?: string;
}

export interface CodeSuggestion {
  type: 'improvement' | 'optimization' | 'best_practice' | 'bug_fix';
  severity: 'low' | 'medium' | 'high';
  message: string;
  lineNumber?: number;
  suggestion?: string;
  reasoning: string;
}

export interface ComplexityMetrics {
  timeComplexity: string;
  spaceComplexity: string;
  cyclomaticComplexity: number;
  linesOfCode: number;
  maintainabilityIndex: number;
}

export interface SecurityIssue {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  lineNumber?: number;
  recommendation: string;
}

export interface PerformanceInsight {
  type: 'memory' | 'cpu' | 'algorithm' | 'data_structure';
  impact: 'low' | 'medium' | 'high';
  description: string;
  suggestion: string;
  estimatedImprovement?: string;
}

export interface HintRequest {
  problemId: string;
  userCode?: string;
  previousHints?: string[];
  userLevel: string;
}

export interface Hint {
  level: number;
  content: string;
  type: 'conceptual' | 'algorithmic' | 'implementation' | 'debugging';
  revealsSolution: boolean;
}

export interface InterviewSession {
  id: string;
  userId: string;
  type: 'technical' | 'behavioral' | 'system_design';
  difficulty: 'junior' | 'mid' | 'senior' | 'staff';
  companyProfile?: string;
  questions: InterviewQuestion[];
  responses: InterviewResponse[];
  feedback: InterviewFeedback;
  startedAt: Date;
  completedAt?: Date;
  status: 'active' | 'completed' | 'abandoned';
}

export interface InterviewQuestion {
  id: string;
  type: 'coding' | 'system_design' | 'behavioral';
  question: string;
  context?: string;
  expectedDuration: number; // in minutes
  followUpQuestions?: string[];
}

export interface InterviewResponse {
  questionId: string;
  response: string;
  code?: string;
  language?: string;
  duration: number; // in seconds
  confidence: number; // 1-5 scale
}

export interface InterviewFeedback {
  overallScore: number; // 1-10 scale
  technicalSkills: SkillAssessment;
  communicationSkills: SkillAssessment;
  problemSolving: SkillAssessment;
  strengths: string[];
  areasForImprovement: string[];
  recommendations: string[];
  detailedFeedback: string;
}

export interface SkillAssessment {
  score: number; // 1-10 scale
  feedback: string;
  examples: string[];
}

export interface LearningRecommendation {
  type: 'problem' | 'topic' | 'course' | 'practice';
  title: string;
  description: string;
  difficulty: string;
  estimatedTime: number; // in minutes
  priority: 'low' | 'medium' | 'high';
  reasoning: string;
  resources: LearningResource[];
}

export interface LearningResource {
  type: 'article' | 'video' | 'book' | 'course' | 'problem';
  title: string;
  url?: string;
  description?: string;
  duration?: number;
}
