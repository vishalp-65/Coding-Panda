/**
 * Comprehensive TypeScript API Types
 * Generated from OpenAPI specification for AI-Powered Coding Platform
 *
 * This file contains all the TypeScript interfaces and types for the API
 * Use these types for type safety across frontend and backend services
 */

// ============================================================================
// Base Response Types
// ============================================================================

export interface BaseResponse {
    success: boolean;
    message?: string;
}

export interface SuccessResponse<T = any> extends BaseResponse {
    success: true;
    data: T;
}

export interface ErrorResponse extends BaseResponse {
    success: false;
    error: {
        code: string;
        message: string;
        details?: Record<string, any>;
    };
}

export interface PaginatedResponse<T = any> extends BaseResponse {
    success: true;
    data: T[];
    pagination: {
        total: number;
        limit: number;
        offset: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
}

export interface HealthCheck {
    success: boolean;
    data: {
        service: string;
        status: 'healthy' | 'unhealthy' | 'degraded';
        version: string;
        timestamp?: string;
        uptime?: string;
        dependencies?: Record<string, string>;
    };
}

// ============================================================================
// Authentication & User Types
// ============================================================================

export type UserRole = 'user' | 'admin' | 'moderator' | 'contest_creator';

export interface User {
    id: string;
    username: string;
    email: string;
    firstName?: string;
    lastName?: string;
    avatar?: string;
    roles: UserRole[];
    preferences: UserPreferences;
    createdAt: string;
    updatedAt: string;
    isActive: boolean;
    isVerified: boolean;
}

export interface UserPreferences {
    theme: 'light' | 'dark' | 'auto';
    language: string;
    notifications: NotificationPreferences;
    privacy: PrivacySettings;
}

export interface NotificationPreferences {
    email: boolean;
    push: boolean;
    inApp: boolean;
    contests: boolean;
    achievements: boolean;
    systemUpdates: boolean;
}

export interface PrivacySettings {
    profileVisibility: 'public' | 'private' | 'friends';
    showEmail: boolean;
    showRealName: boolean;
    allowAnalytics: boolean;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface RegisterRequest {
    username: string;
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    acceptTerms: true;
}

export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}

export interface AuthResponse {
    user: User;
    tokens: AuthTokens;
}

export interface RefreshTokenRequest {
    refreshToken: string;
}

// ============================================================================
// Problem Types
// ============================================================================

export type ProblemDifficulty = 'easy' | 'medium' | 'hard';

export interface ProblemExample {
    input: string;
    output: string;
    explanation?: string;
}

export interface TestCase {
    id: string;
    input: string;
    expectedOutput: string;
    isHidden?: boolean;
    weight?: number;
}

export interface ProblemStatistics {
    totalSubmissions: number;
    acceptedSubmissions: number;
    acceptanceRate: number;
    averageRating?: number;
    totalRatings?: number;
}

export interface Problem {
    id: string;
    title: string;
    description: string;
    difficulty: ProblemDifficulty;
    category: string;
    tags: string[];
    constraints?: string;
    examples: ProblemExample[];
    testCases: TestCase[];
    timeLimit: number;
    memoryLimit: number;
    authorId: string;
    initialCode?: InitialCode;
    statistics?: ProblemStatistics;
    createdAt: string;
    updatedAt: string;
    isActive: boolean;
}

export interface CreateProblemRequest {
    title: string;
    description: string;
    difficulty: ProblemDifficulty;
    category: string;
    tags: string[];
    constraints?: string;
    examples: ProblemExample[];
    testCases: TestCase[];
    timeLimit: number;
    memoryLimit: number;
}

export interface ProblemSearchParams {
    search?: string;
    difficulty?: ProblemDifficulty;
    category?: string;
    tags?: string[];
    sortBy?: 'title' | 'difficulty' | 'createdAt' | 'popularity';
    sort?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
}

export interface RatingRequest {
    rating: number; // 1-5
    comment?: string;
}

// ============================================================================
// Code Execution Types
// ============================================================================

export type ProgrammingLanguage =
    | 'python'
    | 'javascript'
    | 'java'
    | 'cpp'
    | 'go'
    | 'rust'
    | 'typescript'
    | 'c'
    | 'csharp';

// Enhanced code template structure for LeetCode-style handling
export interface CodeTemplate {
    userEditableRegion: string;
    hiddenCode: string;
    functionSignature: string;
    imports?: string;
    helperClasses?: string;
}

export interface InitialCode {
    javascript?: CodeTemplate;
    python?: CodeTemplate;
    java?: CodeTemplate;
    cpp?: CodeTemplate;
    go?: CodeTemplate;
    rust?: CodeTemplate;
}

export interface CodeMergeRequest {
    userCode: string;
    language: ProgrammingLanguage;
    problemId: string;
}

export interface CodeMergeResult {
    success: boolean;
    mergedCode: string;
    error?: string;
}

export interface ExecutionRequest {
    code: string;
    language: ProgrammingLanguage;
    testCases: TestCase[];
    timeLimit?: number;
    memoryLimit?: number;
}

export type ExecutionStatus =
    | 'accepted'
    | 'wrong_answer'
    | 'time_limit_exceeded'
    | 'memory_limit_exceeded'
    | 'runtime_error'
    | 'compilation_error';

export interface TestCaseResult {
    testCaseId: string;
    status: 'passed' | 'failed' | 'timeout' | 'error';
    actualOutput?: string;
    expectedOutput: string;
    executionTime?: number;
    memoryUsed?: number;
    error?: string;
}

export interface ExecutionResult {
    success: boolean;
    results: TestCaseResult[];
    overallStatus: ExecutionStatus;
    executionTime?: number;
    memoryUsed?: number;
    compilationOutput?: string;
    error?: string;
}

export interface SupportedLanguage {
    language: string;
    image: string;
    file_extension: string;
    needs_compilation: boolean;
}

export interface ExecutionMetrics {
    status: string;
    service: string;
    uptime: string;
    executions_total: number;
    executions_success: number;
    executions_failed: number;
    languages_supported: string[];
}

// ============================================================================
// Contest Types
// ============================================================================

export type ContestStatus = 'upcoming' | 'active' | 'completed' | 'cancelled';

export interface Contest {
    id: string;
    title: string;
    description: string;
    startTime: string;
    endTime: string;
    duration: number; // minutes
    problems: string[]; // problem IDs
    participants: string[]; // user IDs
    maxParticipants?: number;
    registrationDeadline?: string;
    isPublic: boolean;
    creatorId: string;
    status: ContestStatus;
    rules?: string;
    prizes?: string[];
    createdAt: string;
    updatedAt: string;
}

export interface CreateContestRequest {
    title: string;
    description: string;
    startTime: string;
    duration: number;
    problems: string[];
    maxParticipants?: number;
    registrationDeadline?: string;
    isPublic?: boolean;
    rules?: string;
    prizes?: string[];
}

export interface ContestSubmission {
    problemId: string;
    submissionTime: string;
    status: ExecutionStatus;
    score: number;
    attempts: number;
}

export interface LeaderboardEntry {
    rank: number;
    userId: string;
    username: string;
    score: number;
    solvedProblems: number;
    totalTime: number; // minutes
    submissions: ContestSubmission[];
}

export interface ContestLeaderboard {
    contestId: string;
    rankings: LeaderboardEntry[];
    lastUpdated: string;
}

export interface ContestSubmitRequest {
    problemId: string;
    code: string;
    language: ProgrammingLanguage;
}

// ============================================================================
// AI Analysis Types
// ============================================================================

export type AnalysisType =
    | 'quality'
    | 'security'
    | 'performance'
    | 'style'
    | 'complexity'
    | 'bugs';
export type IssueType = 'error' | 'warning' | 'info' | 'suggestion';
export type IssueSeverity = 'critical' | 'high' | 'medium' | 'low';
export type IssueCategory =
    | 'quality'
    | 'security'
    | 'performance'
    | 'style'
    | 'complexity'
    | 'bugs';

export interface AnalysisRequest {
    code: string;
    language: ProgrammingLanguage;
    analysisTypes?: AnalysisType[];
    context?: {
        problemId?: string;
        userId?: string;
        sessionId?: string;
    };
}

export interface CodeIssue {
    id: string;
    type: IssueType;
    category: IssueCategory;
    severity: IssueSeverity;
    message: string;
    description?: string;
    line: number;
    column?: number;
    suggestion?: string;
    fixable?: boolean;
}

export interface CodeSuggestion {
    id: string;
    title: string;
    description: string;
    category: string;
    priority: 'high' | 'medium' | 'low';
    codeExample?: string;
    explanation?: string;
}

export interface CodeMetrics {
    linesOfCode: number;
    cyclomaticComplexity: number;
    maintainabilityIndex: number;
    duplicatedLines?: number;
    testCoverage?: number;
    technicalDebt?: string;
}

export interface AnalysisResult {
    success: boolean;
    analysisId: string;
    overallScore: number; // 0-100
    issues: CodeIssue[];
    suggestions: CodeSuggestion[];
    metrics: CodeMetrics;
    executionTime?: number;
    timestamp: string;
}

export interface HintRequest {
    problemId: string;
    userCode: string;
    language: ProgrammingLanguage;
    hintLevel?: number; // 1-5
}

export interface Hint {
    id: string;
    level: number;
    title: string;
    content: string;
    type: 'conceptual' | 'implementation' | 'debugging';
}

export interface ExplanationRequest {
    code: string;
    language: ProgrammingLanguage;
    explanationLevel?: 'beginner' | 'intermediate' | 'advanced';
}

export interface CodeExplanation {
    explanation: string;
    keyPoints: string[];
    complexity?: {
        time: string;
        space: string;
    };
    suggestions?: string[];
}

// ============================================================================
// Notification Types
// ============================================================================

export type NotificationType =
    | 'info'
    | 'success'
    | 'warning'
    | 'error'
    | 'achievement'
    | 'contest'
    | 'system';
export type NotificationChannel = 'email' | 'push' | 'in_app' | 'sms';
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface Notification {
    id: string;
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    data?: Record<string, any>;
    channels: NotificationChannel[];
    priority: NotificationPriority;
    isRead: boolean;
    readAt?: string;
    createdAt: string;
    scheduledFor?: string;
}

export interface CreateNotificationRequest {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    data?: Record<string, any>;
    channels?: NotificationChannel[];
    priority?: NotificationPriority;
    scheduledFor?: string;
}

// ============================================================================
// Analytics Types
// ============================================================================

export type EventType =
    | 'page_view'
    | 'problem_attempt'
    | 'problem_solved'
    | 'contest_join'
    | 'code_execution'
    | 'hint_request';

export interface AnalyticsEvent {
    eventType: EventType;
    userId: string;
    sessionId?: string;
    properties?: Record<string, any>;
    timestamp: string;
    userAgent?: string;
    ipAddress?: string;
}

export interface TrackEventRequest {
    eventType: EventType;
    properties?: Record<string, any>;
    sessionId?: string;
}

export interface AnalyticsDashboard {
    totalUsers: number;
    activeUsers: number;
    totalProblems: number;
    totalSubmissions: number;
    successRate: number;
    popularLanguages: Array<{
        language: string;
        count: number;
    }>;
    recentActivity: AnalyticsEvent[];
    timeRange: string;
    generatedAt: string;
}

// ============================================================================
// Privacy & GDPR Types
// ============================================================================

export type ConsentType =
    | 'analytics'
    | 'marketing'
    | 'functional'
    | 'necessary';
export type ExportFormat = 'json' | 'csv' | 'xml';
export type DeletionReason =
    | 'no_longer_needed'
    | 'withdraw_consent'
    | 'unlawful_processing'
    | 'other';

export interface ConsentRequest {
    consentType: ConsentType;
    granted: boolean;
    version?: string;
}

export interface ConsentRecord {
    consentType: ConsentType;
    granted: boolean;
    timestamp: string;
    version?: string;
}

export interface DataExportRequest {
    format?: ExportFormat;
    includeAnalytics?: boolean;
}

export interface ExportRequestStatus {
    requestId: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    createdAt: string;
    completedAt?: string;
}

export interface DataDeletionRequest {
    reason: DeletionReason;
    confirmPassword: string;
}

// ============================================================================
// Interview Simulation Types
// ============================================================================

export type InterviewType =
    | 'technical'
    | 'behavioral'
    | 'system_design'
    | 'mixed';
export type CompanyType = 'faang' | 'startup' | 'enterprise' | 'consulting';
export type DifficultyLevel = 'junior' | 'mid' | 'senior' | 'staff';
export type InterviewStatus = 'created' | 'active' | 'completed' | 'cancelled';

export interface CreateInterviewRequest {
    userId: string;
    interviewType: InterviewType;
    companyType: CompanyType;
    targetRole: string;
    difficultyLevel: DifficultyLevel;
    maxQuestions?: number;
    timeLimit?: number; // minutes
    scheduledTime?: string;
}

export interface InterviewSession {
    id: string;
    userId: string;
    interviewType: InterviewType;
    companyType: CompanyType;
    targetRole: string;
    difficultyLevel: DifficultyLevel;
    status: InterviewStatus;
    maxQuestions: number;
    timeLimit?: number;
    startTime?: string;
    endTime?: string;
    totalDuration?: number;
    createdAt: string;
}

export interface InterviewQuestion {
    id: string;
    type: 'coding' | 'behavioral' | 'system_design' | 'technical_concept';
    title: string;
    description: string;
    difficulty: DifficultyLevel;
    timeLimit?: number;
    followUpQuestions?: string[];
}

export interface SubmitResponseRequest {
    questionId: string;
    responseText?: string;
    codeSolution?: string;
    language?: ProgrammingLanguage;
    confidenceLevel?: number; // 1-5
}

// ============================================================================
// Learning System Types
// ============================================================================

export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';
export type ConceptCategory =
    | 'algorithms'
    | 'data_structures'
    | 'system_design'
    | 'databases'
    | 'web_development'
    | 'machine_learning';

export interface SkillAssessmentRequest {
    userId: string;
    language: ProgrammingLanguage;
    includeWeakAreas?: boolean;
    assessmentType?: 'quick' | 'comprehensive' | 'focused';
}

export interface SkillAssessment {
    userId: string;
    language: ProgrammingLanguage;
    overallLevel: SkillLevel;
    skillAreas: Array<{
        area: string;
        level: SkillLevel;
        confidence: number;
    }>;
    weakAreas?: string[];
    recommendations?: string[];
    assessmentDate: string;
}

export interface LearningPathRequest {
    userId: string;
    targetConcepts: ConceptCategory[];
    currentLevel?: SkillLevel;
    timeCommitment: number; // hours per week
    preferredDifficulty?: 'easy' | 'medium' | 'hard' | 'mixed';
}

export interface LearningPath {
    pathId: string;
    userId: string;
    targetConcepts: ConceptCategory[];
    estimatedDuration: string;
    milestones: Array<{
        id: string;
        title: string;
        description: string;
        estimatedTime: number;
        resources: string[];
    }>;
    resources: Array<{
        id: string;
        title: string;
        type: 'article' | 'video' | 'exercise' | 'project';
        url?: string;
        difficulty: DifficultyLevel;
    }>;
    createdAt: string;
}

// ============================================================================
// API Request/Response Helpers
// ============================================================================

export interface PaginationParams {
    limit?: number;
    offset?: number;
    sort?: 'asc' | 'desc';
}

export interface ApiHeaders {
    Authorization?: string;
    'Content-Type'?: string;
    'X-API-Key'?: string;
    'X-Request-ID'?: string;
}

export interface ApiError extends Error {
    status?: number;
    code?: string;
    details?: Record<string, any>;
}

// ============================================================================
// Service-Specific Types
// ============================================================================

// API Gateway Types
export interface GatewayMetrics {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    uptime: string;
}

// Real-time Service Types
export interface WebSocketMessage {
    type: string;
    payload: any;
    timestamp: string;
    userId?: string;
}

// Queue and Background Job Types
export interface QueueStats {
    active: number;
    waiting: number;
    completed: number;
    failed: number;
    delayed: number;
}

// ============================================================================
// Utility Types
// ============================================================================

export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;
export type PaginatedApiResponse<T> = PaginatedResponse<T> | ErrorResponse;

// Generic CRUD operations
export interface CrudOperations<T, CreateT = Partial<T>, UpdateT = Partial<T>> {
    create: (data: CreateT) => Promise<ApiResponse<T>>;
    read: (id: string) => Promise<ApiResponse<T>>;
    update: (id: string, data: UpdateT) => Promise<ApiResponse<T>>;
    delete: (id: string) => Promise<ApiResponse<void>>;
    list: (params?: PaginationParams) => Promise<PaginatedApiResponse<T>>;
}

// Service health check
export interface ServiceHealth {
    service: string;
    status: 'healthy' | 'unhealthy' | 'degraded';
    version: string;
    uptime?: string;
    dependencies?: Record<string, 'healthy' | 'unhealthy'>;
}

// Rate limiting
export interface RateLimitInfo {
    limit: number;
    remaining: number;
    reset: number;
    retryAfter?: number;
}

// ============================================================================
// Constants and Enums
// ============================================================================

export const HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    ACCEPTED: 202,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    UNPROCESSABLE_ENTITY: 422,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_SERVER_ERROR: 500,
    SERVICE_UNAVAILABLE: 503,
} as const;

export const API_ENDPOINTS = {
    // Authentication
    AUTH_LOGIN: '/auth/login',
    AUTH_REGISTER: '/auth/register',
    AUTH_REFRESH: '/auth/refresh-token',
    AUTH_LOGOUT: '/auth/logout',
    AUTH_ME: '/auth/me',

    // Users
    USERS: '/users',
    USER_PROFILE: '/users/profile',
    USER_PREFERENCES: '/users/preferences',

    // Problems
    PROBLEMS: '/problems',
    PROBLEM_BOOKMARKS: '/problems/bookmarks',
    POPULAR_TAGS: '/problems/tags/popular',

    // Code Execution
    CODE_EXECUTE: '/code-execution/execute',
    CODE_LANGUAGES: '/code-execution/languages',

    // Contests
    CONTESTS: '/contests',

    // AI Analysis
    AI_ANALYZE: '/ai-analysis/analyze',
    AI_HINTS: '/ai-analysis/hints',
    AI_EXPLAIN: '/ai-analysis/explain',

    // Notifications
    NOTIFICATIONS: '/notifications',

    // Analytics
    ANALYTICS_EVENTS: '/analytics/events',
    ANALYTICS_DASHBOARD: '/analytics/dashboard',

    // Health Checks
    HEALTH: '/health',
} as const;

export const RATE_LIMITS = {
    GENERAL: { limit: 1000, window: '1h' },
    AUTH: { limit: 10, window: '15m' },
    CODE_EXECUTION: { limit: 100, window: '1h' },
    AI_ANALYSIS: { limit: 50, window: '1h' },
} as const;

// ============================================================================
// Type Guards and Validators
// ============================================================================

export function isSuccessResponse<T>(
    response: ApiResponse<T>
): response is SuccessResponse<T> {
    return response.success === true;
}

export function isErrorResponse(
    response: ApiResponse<any>
): response is ErrorResponse {
    return response.success === false;
}

export function isPaginatedResponse<T>(
    response: any
): response is PaginatedResponse<T> {
    return response.success === true && 'pagination' in response;
}

// Validation helpers
export function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

export function isValidUsername(username: string): boolean {
    const usernameRegex = /^[a-zA-Z0-9_-]{3,30}$/;
    return usernameRegex.test(username);
}

export function isValidPassword(password: string): boolean {
    return password.length >= 8;
}

export function isValidProgrammingLanguage(
    language: string
): language is ProgrammingLanguage {
    const validLanguages: ProgrammingLanguage[] = [
        'python',
        'javascript',
        'java',
        'cpp',
        'go',
        'rust',
        'typescript',
        'c',
        'csharp',
    ];
    return validLanguages.includes(language as ProgrammingLanguage);
}

export function isValidDifficulty(
    difficulty: string
): difficulty is ProblemDifficulty {
    const validDifficulties: ProblemDifficulty[] = ['easy', 'medium', 'hard'];
    return validDifficulties.includes(difficulty as ProblemDifficulty);
}

// ============================================================================
// Export all types for easy importing
// ============================================================================

// Note: All interfaces and types are already exported with their declarations above
// This export block is for re-exporting convenience, but since all types are already
// exported with 'export interface' or 'export type', this section is optional

// Export only non-type values
// export {
//   HTTP_STATUS,
//   API_ENDPOINTS,
//   RATE_LIMITS,
//   // validation functions
//   isSuccessResponse,
//   isErrorResponse,
//   isPaginatedResponse,
//   isValidEmail,
//   isValidUsername,
//   isValidPassword,
//   isValidProgrammingLanguage,
//   isValidDifficulty,
// };
