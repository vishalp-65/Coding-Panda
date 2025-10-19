// Basic TypeScript interfaces that match our proto definitions
// This allows the code to compile while we work on protobuf generation

// Common types
export interface HealthCheckRequest { }

export interface HealthCheckResponse {
    service: string;
    status: string;
    version: string;
    timestamp: string;
    uptime: number;
}

export interface PaginationRequest {
    limit: number;
    offset: number;
    sortBy?: string;
    sortOrder?: string;
}

export interface PaginationResponse {
    total: number;
    limit: number;
    offset: number;
    hasNext: boolean;
    hasPrev: boolean;
}

export interface RequestMetadata {
    requestId: string;
    userId?: string;
    userEmail?: string;
    userRoles?: string[];
    sessionId?: string;
    ipAddress?: string;
    userAgent?: string;
}

export interface BaseResponse {
    success: boolean;
    message?: string;
    validationErrors?: ValidationError[];
    error?: ErrorDetails;
}

export interface ValidationError {
    field: string;
    message: string;
    code: string;
}

export interface ErrorDetails {
    code: string;
    message: string;
    details?: Record<string, any>;
}

// User types
export interface User {
    id: string;
    username: string;
    email: string;
    firstName?: string;
    lastName?: string;
    avatar?: string;
    roles: string[];
    preferences?: UserPreferences;
    createdAt: string;
    updatedAt: string;
    isActive: boolean;
    isVerified: boolean;
}

export interface UserPreferences {
    theme: string;
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
    profileVisibility: string;
    showEmail: boolean;
    showRealName: boolean;
    allowAnalytics: boolean;
}

// User service requests/responses
export interface CreateUserRequest {
    metadata: RequestMetadata;
    username: string;
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    acceptTerms: boolean;
}

export interface CreateUserResponse {
    base: BaseResponse;
    user?: User;
}

export interface GetUserRequest {
    metadata: RequestMetadata;
    userId: string;
}

export interface GetUserResponse {
    base: BaseResponse;
    user?: User;
}

export interface ValidateTokenRequest {
    token: string;
}

export interface ValidateTokenResponse {
    base: BaseResponse;
    valid: boolean;
    user?: User;
    expiresAt?: number;
}

// Problem types
export interface Problem {
    id: string;
    title: string;
    description: string;
    difficulty: string;
    category: string;
    tags: string[];
    constraints?: string;
    examples: ProblemExample[];
    testCases: TestCase[];
    timeLimit: number;
    memoryLimit: number;
    authorId: string;
    statistics?: ProblemStatistics;
    createdAt: string;
    updatedAt: string;
    isActive: boolean;
}

export interface ProblemExample {
    input: string;
    output: string;
    explanation?: string;
}

export interface TestCase {
    id: string;
    input: string;
    expectedOutput: string;
    isHidden: boolean;
    weight: number;
}

export interface ProblemStatistics {
    totalSubmissions: number;
    acceptedSubmissions: number;
    acceptanceRate: number;
    averageRating: number;
    totalRatings: number;
}

// Service client interfaces (placeholders)
export interface UserServiceClient {
    close(): void;
}

export interface ProblemServiceClient {
    close(): void;
}

export interface ExecutionServiceClient {
    close(): void;
}

export interface ContestServiceClient {
    close(): void;
}

export interface AnalyticsServiceClient {
    close(): void;
}

export interface NotificationServiceClient {
    close(): void;
}

export interface AIAnalysisServiceClient {
    close(): void;
}