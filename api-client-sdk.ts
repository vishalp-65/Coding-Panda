/**
 * Comprehensive API Client SDK
 *
 * This SDK provides a complete client for interacting with all services
 * in the AI-Powered Coding Platform. It includes:
 * - Type-safe API calls
 * - Authentication handling
 * - Error handling
 * - Rate limiting
 * - Request/response interceptors
 * - Retry logic
 */

import {
  // Base types
  ApiResponse,
  PaginatedApiResponse,
  SuccessResponse,
  ErrorResponse,
  HealthCheck,
  PaginationParams,
  ApiHeaders,
  ApiError as ImportedApiError,

  // Auth types
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  RefreshTokenRequest,
  User,
  UserPreferences,

  // Problem types
  Problem,
  CreateProblemRequest,
  ProblemSearchParams,
  RatingRequest,

  // Code execution types
  ExecutionRequest,
  ExecutionResult,
  SupportedLanguage,
  ExecutionMetrics,

  // Contest types
  Contest,
  CreateContestRequest,
  ContestLeaderboard,
  ContestSubmitRequest,

  // AI Analysis types
  AnalysisRequest,
  AnalysisResult,
  HintRequest,
  Hint,
  ExplanationRequest,
  CodeExplanation,

  // Notification types
  Notification,
  CreateNotificationRequest,
  NotificationPreferences,

  // Analytics types
  TrackEventRequest,
  AnalyticsDashboard,
  AnalyticsEvent,

  // Privacy types
  ConsentRequest,
  ConsentRecord,
  DataExportRequest,
  ExportRequestStatus,
  DataDeletionRequest,

  // Interview types
  CreateInterviewRequest,
  InterviewSession,
  InterviewQuestion,
  SubmitResponseRequest,

  // Learning types
  SkillAssessmentRequest,
  SkillAssessment,
  LearningPathRequest,
  LearningPath,

  // Constants
  API_ENDPOINTS,
  HTTP_STATUS,
  isSuccessResponse,
  isErrorResponse,
} from './api-types';

// ============================================================================
// Configuration and Types
// ============================================================================

export interface ApiClientConfig {
  baseURL: string;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
  defaultHeaders?: Record<string, string>;
  onRequest?: (config: RequestConfig) => RequestConfig | Promise<RequestConfig>;
  onResponse?: (response: Response) => Response | Promise<Response>;
  onError?: (error: ApiError) => void | Promise<void>;
}

export interface RequestConfig {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  headers?: Record<string, string>;
  body?: any;
  params?: Record<string, any>;
  timeout?: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

// ============================================================================
// Main API Client Class
// ============================================================================

export class ApiClient {
  private config: Required<ApiClientConfig>;
  private tokens: AuthTokens | null = null;
  private refreshPromise: Promise<void> | null = null;

  constructor(config: ApiClientConfig) {
    this.config = {
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
      defaultHeaders: {
        'Content-Type': 'application/json',
      },
      onRequest: config => config,
      onResponse: response => response,
      onError: () => {},
      ...config,
    };
  }

  // ============================================================================
  // Core HTTP Methods
  // ============================================================================

  private async request<T>(config: RequestConfig): Promise<ApiResponse<T>> {
    const requestConfig = await this.config.onRequest(config);

    // Add authentication if available
    if (this.tokens?.accessToken) {
      requestConfig.headers = {
        ...requestConfig.headers,
        Authorization: `Bearer ${this.tokens.accessToken}`,
      };
    }

    // Build URL with query parameters
    const url = new URL(requestConfig.url, this.config.baseURL);
    if (requestConfig.params) {
      Object.entries(requestConfig.params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    const fetchConfig: RequestInit = {
      method: requestConfig.method,
      headers: {
        ...this.config.defaultHeaders,
        ...requestConfig.headers,
      },
      signal: AbortSignal.timeout(requestConfig.timeout || this.config.timeout),
    };

    if (requestConfig.body && requestConfig.method !== 'GET') {
      fetchConfig.body = JSON.stringify(requestConfig.body);
    }

    let lastError: ApiError;

    for (let attempt = 0; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const response = await fetch(url.toString(), fetchConfig);
        const processedResponse = await this.config.onResponse(response);

        if (!processedResponse.ok) {
          const errorData = await this.parseErrorResponse(processedResponse);
          throw new ApiError(
            errorData.error.message,
            processedResponse.status,
            errorData.error.code
          );
        }

        const data = await processedResponse.json();
        return data as ApiResponse<T>;
      } catch (error) {
        lastError = this.createApiError(error);

        // Don't retry on authentication errors or client errors
        if (lastError.status && lastError.status < 500) {
          break;
        }

        // Don't retry on the last attempt
        if (attempt === this.config.retryAttempts) {
          break;
        }

        // Wait before retrying
        await this.delay(this.config.retryDelay * Math.pow(2, attempt));
      }
    }

    await this.config.onError(lastError!);
    throw lastError!;
  }

  private async parseErrorResponse(response: Response): Promise<ErrorResponse> {
    try {
      return (await response.json()) as ErrorResponse;
    } catch {
      return {
        success: false,
        error: {
          code: 'UNKNOWN_ERROR',
          message: `HTTP ${response.status}: ${response.statusText}`,
        },
      };
    }
  }

  private createApiError(error: any): ApiError {
    if (error instanceof ApiError) {
      return error;
    }

    const apiError = new ApiError(error.message || 'Unknown error occurred');
    apiError.status = error.status;
    apiError.code = error.code;
    return apiError;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ============================================================================
  // Authentication Methods
  // ============================================================================

  public setTokens(tokens: AuthTokens): void {
    this.tokens = tokens;
  }

  public clearTokens(): void {
    this.tokens = null;
    this.refreshPromise = null;
  }

  public getTokens(): AuthTokens | null {
    return this.tokens;
  }

  private async refreshTokens(): Promise<void> {
    if (!this.tokens?.refreshToken) {
      throw new ApiError('No refresh token available', 401, 'NO_REFRESH_TOKEN');
    }

    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.performTokenRefresh();

    try {
      await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async performTokenRefresh(): Promise<void> {
    const response = await this.request<AuthResponse>({
      method: 'POST',
      url: API_ENDPOINTS.AUTH_REFRESH,
      body: { refreshToken: this.tokens!.refreshToken },
    });

    if (isSuccessResponse(response)) {
      this.setTokens({
        accessToken: response.data.tokens.accessToken,
        refreshToken: response.data.tokens.refreshToken,
        expiresAt: Date.now() + response.data.tokens.expiresIn * 1000,
      });
    } else {
      this.clearTokens();
      throw new ApiError('Token refresh failed', 401, 'REFRESH_FAILED');
    }
  }

  // ============================================================================
  // Authentication API
  // ============================================================================

  public readonly auth = {
    login: async (
      credentials: LoginRequest
    ): Promise<ApiResponse<AuthResponse>> => {
      const response = await this.request<AuthResponse>({
        method: 'POST',
        url: API_ENDPOINTS.AUTH_LOGIN,
        body: credentials,
      });

      if (isSuccessResponse(response)) {
        this.setTokens({
          accessToken: response.data.tokens.accessToken,
          refreshToken: response.data.tokens.refreshToken,
          expiresAt: Date.now() + response.data.tokens.expiresIn * 1000,
        });
      }

      return response;
    },

    register: async (
      userData: RegisterRequest
    ): Promise<ApiResponse<AuthResponse>> => {
      return this.request<AuthResponse>({
        method: 'POST',
        url: API_ENDPOINTS.AUTH_REGISTER,
        body: userData,
      });
    },

    logout: async (): Promise<ApiResponse<void>> => {
      const response = await this.request<void>({
        method: 'POST',
        url: API_ENDPOINTS.AUTH_LOGOUT,
      });

      this.clearTokens();
      return response;
    },

    refreshToken: async (): Promise<ApiResponse<AuthResponse>> => {
      await this.refreshTokens();
      return { success: true, data: null as any }; // Tokens are already set
    },

    getCurrentUser: async (): Promise<ApiResponse<User>> => {
      return this.request<User>({
        method: 'GET',
        url: API_ENDPOINTS.AUTH_ME,
      });
    },

    verifyEmail: async (token: string): Promise<ApiResponse<void>> => {
      return this.request<void>({
        method: 'GET',
        url: '/auth/verify-email',
        params: { token },
      });
    },
  };

  // ============================================================================
  // User Management API
  // ============================================================================

  public readonly users = {
    getProfile: async (): Promise<ApiResponse<User>> => {
      return this.request<User>({
        method: 'GET',
        url: API_ENDPOINTS.USER_PROFILE,
      });
    },

    updateProfile: async (
      updates: Partial<User>
    ): Promise<ApiResponse<User>> => {
      return this.request<User>({
        method: 'PUT',
        url: API_ENDPOINTS.USER_PROFILE,
        body: updates,
      });
    },

    updatePreferences: async (
      preferences: UserPreferences
    ): Promise<ApiResponse<void>> => {
      return this.request<void>({
        method: 'PUT',
        url: API_ENDPOINTS.USER_PREFERENCES,
        body: preferences,
      });
    },

    checkEmailAvailability: async (
      email: string
    ): Promise<ApiResponse<{ available: boolean }>> => {
      return this.request<{ available: boolean }>({
        method: 'GET',
        url: '/users/check-email',
        params: { email },
      });
    },

    checkUsernameAvailability: async (
      username: string
    ): Promise<ApiResponse<{ available: boolean }>> => {
      return this.request<{ available: boolean }>({
        method: 'GET',
        url: '/users/check-username',
        params: { username },
      });
    },

    getUserById: async (userId: string): Promise<ApiResponse<User>> => {
      return this.request<User>({
        method: 'GET',
        url: `/users/${userId}`,
      });
    },

    getAllUsers: async (
      params?: PaginationParams & { search?: string; role?: string }
    ): Promise<PaginatedApiResponse<User>> => {
      return this.request<User[]>({
        method: 'GET',
        url: API_ENDPOINTS.USERS,
        params,
      }) as Promise<PaginatedApiResponse<User>>;
    },
  };

  // ============================================================================
  // Problem Management API
  // ============================================================================

  public readonly problems = {
    search: async (
      params?: ProblemSearchParams
    ): Promise<PaginatedApiResponse<Problem>> => {
      return this.request<Problem[]>({
        method: 'GET',
        url: API_ENDPOINTS.PROBLEMS,
        params,
      }) as Promise<PaginatedApiResponse<Problem>>;
    },

    getById: async (problemId: string): Promise<ApiResponse<Problem>> => {
      return this.request<Problem>({
        method: 'GET',
        url: `/problems/${problemId}`,
      });
    },

    create: async (
      problemData: CreateProblemRequest
    ): Promise<ApiResponse<Problem>> => {
      return this.request<Problem>({
        method: 'POST',
        url: API_ENDPOINTS.PROBLEMS,
        body: problemData,
      });
    },

    update: async (
      problemId: string,
      updates: Partial<CreateProblemRequest>
    ): Promise<ApiResponse<Problem>> => {
      return this.request<Problem>({
        method: 'PUT',
        url: `/problems/${problemId}`,
        body: updates,
      });
    },

    delete: async (problemId: string): Promise<ApiResponse<void>> => {
      return this.request<void>({
        method: 'DELETE',
        url: `/problems/${problemId}`,
      });
    },

    bookmark: async (problemId: string): Promise<ApiResponse<void>> => {
      return this.request<void>({
        method: 'POST',
        url: `/problems/${problemId}/bookmark`,
      });
    },

    removeBookmark: async (problemId: string): Promise<ApiResponse<void>> => {
      return this.request<void>({
        method: 'DELETE',
        url: `/problems/${problemId}/bookmark`,
      });
    },

    getBookmarks: async (
      params?: PaginationParams
    ): Promise<PaginatedApiResponse<Problem>> => {
      return this.request<Problem[]>({
        method: 'GET',
        url: API_ENDPOINTS.PROBLEM_BOOKMARKS,
        params,
      }) as Promise<PaginatedApiResponse<Problem>>;
    },

    rate: async (
      problemId: string,
      rating: RatingRequest
    ): Promise<ApiResponse<void>> => {
      return this.request<void>({
        method: 'POST',
        url: `/problems/${problemId}/rate`,
        body: rating,
      });
    },

    getPopularTags: async (
      limit?: number
    ): Promise<ApiResponse<Array<{ tag: string; count: number }>>> => {
      return this.request<Array<{ tag: string; count: number }>>({
        method: 'GET',
        url: API_ENDPOINTS.POPULAR_TAGS,
        params: { limit },
      });
    },
  };

  // ============================================================================
  // Code Execution API
  // ============================================================================

  public readonly codeExecution = {
    execute: async (
      request: ExecutionRequest
    ): Promise<ApiResponse<ExecutionResult>> => {
      return this.request<ExecutionResult>({
        method: 'POST',
        url: API_ENDPOINTS.CODE_EXECUTE,
        body: request,
      });
    },

    getSupportedLanguages: async (): Promise<
      ApiResponse<{ supported_languages: SupportedLanguage[] }>
    > => {
      return this.request<{ supported_languages: SupportedLanguage[] }>({
        method: 'GET',
        url: API_ENDPOINTS.CODE_LANGUAGES,
      });
    },

    getMetrics: async (
      hours?: number
    ): Promise<ApiResponse<ExecutionMetrics>> => {
      return this.request<ExecutionMetrics>({
        method: 'GET',
        url: '/code-execution/metrics',
        params: { hours },
      });
    },

    getUserMetrics: async (
      userId: string,
      hours?: number
    ): Promise<ApiResponse<ExecutionMetrics>> => {
      return this.request<ExecutionMetrics>({
        method: 'GET',
        url: `/code-execution/metrics/user/${userId}`,
        params: { hours },
      });
    },
  };

  // ============================================================================
  // Contest Management API
  // ============================================================================

  public readonly contests = {
    search: async (params?: {
      status?: string;
      search?: string;
      sortBy?: string;
      sort?: string;
      limit?: number;
      offset?: number;
    }): Promise<PaginatedApiResponse<Contest>> => {
      return this.request<Contest[]>({
        method: 'GET',
        url: API_ENDPOINTS.CONTESTS,
        params,
      }) as Promise<PaginatedApiResponse<Contest>>;
    },

    getById: async (contestId: string): Promise<ApiResponse<Contest>> => {
      return this.request<Contest>({
        method: 'GET',
        url: `/contests/${contestId}`,
      });
    },

    create: async (
      contestData: CreateContestRequest
    ): Promise<ApiResponse<Contest>> => {
      return this.request<Contest>({
        method: 'POST',
        url: API_ENDPOINTS.CONTESTS,
        body: contestData,
      });
    },

    update: async (
      contestId: string,
      updates: Partial<CreateContestRequest>
    ): Promise<ApiResponse<Contest>> => {
      return this.request<Contest>({
        method: 'PUT',
        url: `/contests/${contestId}`,
        body: updates,
      });
    },

    delete: async (contestId: string): Promise<ApiResponse<void>> => {
      return this.request<void>({
        method: 'DELETE',
        url: `/contests/${contestId}`,
      });
    },

    register: async (contestId: string): Promise<ApiResponse<void>> => {
      return this.request<void>({
        method: 'POST',
        url: `/contests/${contestId}/register`,
      });
    },

    getLeaderboard: async (
      contestId: string,
      limit?: number
    ): Promise<ApiResponse<ContestLeaderboard>> => {
      return this.request<ContestLeaderboard>({
        method: 'GET',
        url: `/contests/${contestId}/leaderboard`,
        params: { limit },
      });
    },

    submitSolution: async (
      contestId: string,
      submission: ContestSubmitRequest
    ): Promise<ApiResponse<ExecutionResult>> => {
      return this.request<ExecutionResult>({
        method: 'POST',
        url: `/contests/${contestId}/submit`,
        body: submission,
      });
    },
  };

  // ============================================================================
  // AI Analysis API
  // ============================================================================

  public readonly aiAnalysis = {
    analyzeCode: async (
      request: AnalysisRequest
    ): Promise<ApiResponse<AnalysisResult>> => {
      return this.request<AnalysisResult>({
        method: 'POST',
        url: API_ENDPOINTS.AI_ANALYZE,
        body: request,
      });
    },

    generateHints: async (
      request: HintRequest
    ): Promise<ApiResponse<Hint[]>> => {
      return this.request<Hint[]>({
        method: 'POST',
        url: API_ENDPOINTS.AI_HINTS,
        body: request,
      });
    },

    explainCode: async (
      request: ExplanationRequest
    ): Promise<ApiResponse<CodeExplanation>> => {
      return this.request<CodeExplanation>({
        method: 'POST',
        url: API_ENDPOINTS.AI_EXPLAIN,
        body: request,
      });
    },

    getSupportedLanguages: async (): Promise<
      ApiResponse<{ languages: string[]; count: number }>
    > => {
      return this.request<{ languages: string[]; count: number }>({
        method: 'GET',
        url: '/ai-analysis/languages',
      });
    },

    getAnalysisTypes: async (): Promise<
      ApiResponse<{ analysis_types: string[]; count: number }>
    > => {
      return this.request<{ analysis_types: string[]; count: number }>({
        method: 'GET',
        url: '/ai-analysis/analysis-types',
      });
    },

    batchAnalyze: async (
      requests: AnalysisRequest[]
    ): Promise<ApiResponse<any>> => {
      return this.request<any>({
        method: 'POST',
        url: '/ai-analysis/batch-analyze',
        body: requests,
      });
    },
  };

  // ============================================================================
  // Interview Simulation API
  // ============================================================================

  public readonly interview = {
    createSession: async (
      request: CreateInterviewRequest
    ): Promise<ApiResponse<InterviewSession>> => {
      return this.request<InterviewSession>({
        method: 'POST',
        url: '/ai-analysis/interview/sessions',
        body: request,
      });
    },

    startSession: async (
      sessionId: string
    ): Promise<ApiResponse<InterviewSession>> => {
      return this.request<InterviewSession>({
        method: 'POST',
        url: `/ai-analysis/interview/sessions/${sessionId}/start`,
      });
    },

    getSession: async (
      sessionId: string
    ): Promise<ApiResponse<InterviewSession>> => {
      return this.request<InterviewSession>({
        method: 'GET',
        url: `/ai-analysis/interview/sessions/${sessionId}`,
      });
    },

    getCurrentQuestion: async (
      sessionId: string
    ): Promise<ApiResponse<InterviewQuestion | null>> => {
      return this.request<InterviewQuestion | null>({
        method: 'GET',
        url: `/ai-analysis/interview/sessions/${sessionId}/current-question`,
      });
    },

    submitResponse: async (
      sessionId: string,
      response: SubmitResponseRequest
    ): Promise<ApiResponse<any>> => {
      return this.request<any>({
        method: 'POST',
        url: `/ai-analysis/interview/sessions/${sessionId}/responses`,
        body: response,
      });
    },

    completeSession: async (sessionId: string): Promise<ApiResponse<any>> => {
      return this.request<any>({
        method: 'POST',
        url: `/ai-analysis/interview/sessions/${sessionId}/complete`,
      });
    },

    getFeedback: async (sessionId: string): Promise<ApiResponse<any>> => {
      return this.request<any>({
        method: 'GET',
        url: `/ai-analysis/interview/sessions/${sessionId}/feedback`,
      });
    },
  };

  // ============================================================================
  // Learning System API
  // ============================================================================

  public readonly learning = {
    assessSkills: async (
      request: SkillAssessmentRequest
    ): Promise<ApiResponse<SkillAssessment>> => {
      return this.request<SkillAssessment>({
        method: 'POST',
        url: '/ai-analysis/learning/assess-skills',
        body: request,
      });
    },

    generateLearningPath: async (
      request: LearningPathRequest
    ): Promise<ApiResponse<LearningPath>> => {
      return this.request<LearningPath>({
        method: 'POST',
        url: '/ai-analysis/learning/generate-learning-path',
        body: request,
      });
    },

    getRecommendations: async (
      userId: string,
      context: any
    ): Promise<ApiResponse<any>> => {
      return this.request<any>({
        method: 'POST',
        url: '/ai-analysis/learning/recommendations',
        body: { userId, context },
      });
    },

    getWeakAreas: async (
      userId: string,
      language?: string
    ): Promise<ApiResponse<any>> => {
      return this.request<any>({
        method: 'GET',
        url: `/ai-analysis/learning/weak-areas/${userId}`,
        params: { language },
      });
    },

    getLearningResources: async (params?: {
      concepts?: string[];
      difficulty?: string;
      resourceType?: string;
      limit?: number;
    }): Promise<ApiResponse<any>> => {
      return this.request<any>({
        method: 'GET',
        url: '/ai-analysis/learning/learning-resources',
        params,
      });
    },
  };

  // ============================================================================
  // Notification API
  // ============================================================================

  public readonly notifications = {
    create: async (
      notification: CreateNotificationRequest
    ): Promise<ApiResponse<Notification>> => {
      return this.request<Notification>({
        method: 'POST',
        url: API_ENDPOINTS.NOTIFICATIONS,
        body: notification,
      });
    },

    getUserNotifications: async (
      userId: string,
      params?: PaginationParams & { unreadOnly?: boolean; type?: string }
    ): Promise<PaginatedApiResponse<Notification>> => {
      return this.request<Notification[]>({
        method: 'GET',
        url: `/notifications/user/${userId}`,
        params,
      }) as Promise<PaginatedApiResponse<Notification>>;
    },

    getById: async (
      notificationId: string
    ): Promise<ApiResponse<Notification>> => {
      return this.request<Notification>({
        method: 'GET',
        url: `/notifications/${notificationId}`,
      });
    },

    markAsRead: async (notificationId: string): Promise<ApiResponse<void>> => {
      return this.request<void>({
        method: 'PATCH',
        url: `/notifications/${notificationId}/read`,
      });
    },

    markAllAsRead: async (userId: string): Promise<ApiResponse<void>> => {
      return this.request<void>({
        method: 'PATCH',
        url: `/notifications/user/${userId}/read-all`,
      });
    },

    getUnreadCount: async (
      userId: string
    ): Promise<ApiResponse<{ unreadCount: number }>> => {
      return this.request<{ unreadCount: number }>({
        method: 'GET',
        url: `/notifications/user/${userId}/unread-count`,
      });
    },

    getPreferences: async (
      userId: string
    ): Promise<ApiResponse<NotificationPreferences>> => {
      return this.request<NotificationPreferences>({
        method: 'GET',
        url: `/notifications/preferences/${userId}`,
      });
    },

    updatePreferences: async (
      userId: string,
      preferences: NotificationPreferences
    ): Promise<ApiResponse<void>> => {
      return this.request<void>({
        method: 'PUT',
        url: `/notifications/preferences/${userId}`,
        body: preferences,
      });
    },
  };

  // ============================================================================
  // Analytics API
  // ============================================================================

  public readonly analytics = {
    trackEvent: async (
      event: TrackEventRequest
    ): Promise<ApiResponse<void>> => {
      return this.request<void>({
        method: 'POST',
        url: API_ENDPOINTS.ANALYTICS_EVENTS,
        body: event,
      });
    },

    getRecentEvents: async (params?: {
      limit?: number;
      eventType?: string;
      hours?: number;
    }): Promise<ApiResponse<AnalyticsEvent[]>> => {
      return this.request<AnalyticsEvent[]>({
        method: 'GET',
        url: API_ENDPOINTS.ANALYTICS_EVENTS,
        params,
      });
    },

    getDashboard: async (
      timeRange?: string
    ): Promise<ApiResponse<AnalyticsDashboard>> => {
      return this.request<AnalyticsDashboard>({
        method: 'GET',
        url: API_ENDPOINTS.ANALYTICS_DASHBOARD,
        params: { timeRange },
      });
    },

    getBehaviorAnalysis: async (
      userId?: string,
      timeRange?: string
    ): Promise<ApiResponse<any>> => {
      return this.request<any>({
        method: 'GET',
        url: '/analytics/behavior/analysis',
        params: { userId, timeRange },
      });
    },

    getEngagementScore: async (userId?: string): Promise<ApiResponse<any>> => {
      return this.request<any>({
        method: 'GET',
        url: '/analytics/behavior/engagement-score',
        params: { userId },
      });
    },
  };

  // ============================================================================
  // Privacy & GDPR API
  // ============================================================================

  public readonly privacy = {
    recordConsent: async (
      consent: ConsentRequest
    ): Promise<ApiResponse<void>> => {
      return this.request<void>({
        method: 'POST',
        url: '/privacy/consent',
        body: consent,
      });
    },

    getUserConsents: async (): Promise<ApiResponse<ConsentRecord[]>> => {
      return this.request<ConsentRecord[]>({
        method: 'GET',
        url: '/privacy/consent',
      });
    },

    withdrawConsent: async (
      consentType: string
    ): Promise<ApiResponse<void>> => {
      return this.request<void>({
        method: 'POST',
        url: '/privacy/consent/withdraw',
        body: { consentType },
      });
    },

    requestDataExport: async (
      request: DataExportRequest
    ): Promise<ApiResponse<{ requestId: string }>> => {
      return this.request<{ requestId: string }>({
        method: 'POST',
        url: '/privacy/export',
        body: request,
      });
    },

    getExportRequests: async (): Promise<
      ApiResponse<ExportRequestStatus[]>
    > => {
      return this.request<ExportRequestStatus[]>({
        method: 'GET',
        url: '/privacy/export',
      });
    },

    downloadExport: async (requestId: string): Promise<Response> => {
      // This returns raw response for file download
      const url = new URL(
        `/privacy/export/${requestId}/download`,
        this.config.baseURL
      );
      return fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${this.tokens?.accessToken}`,
        },
      });
    },

    requestDataDeletion: async (
      request: DataDeletionRequest
    ): Promise<ApiResponse<{ requestId: string }>> => {
      return this.request<{ requestId: string }>({
        method: 'POST',
        url: '/privacy/deletion',
        body: request,
      });
    },
  };

  // ============================================================================
  // Health Check API
  // ============================================================================

  public readonly health = {
    checkApiGateway: async (): Promise<ApiResponse<HealthCheck>> => {
      return this.request<HealthCheck>({
        method: 'GET',
        url: API_ENDPOINTS.HEALTH,
      });
    },

    checkUserService: async (): Promise<ApiResponse<HealthCheck>> => {
      return this.request<HealthCheck>({
        method: 'GET',
        url: '/users/health',
      });
    },

    checkProblemService: async (): Promise<ApiResponse<HealthCheck>> => {
      return this.request<HealthCheck>({
        method: 'GET',
        url: '/problems/health',
      });
    },

    checkCodeExecutionService: async (): Promise<ApiResponse<HealthCheck>> => {
      return this.request<HealthCheck>({
        method: 'GET',
        url: '/code-execution/health',
      });
    },

    checkAiAnalysisService: async (): Promise<ApiResponse<HealthCheck>> => {
      return this.request<HealthCheck>({
        method: 'GET',
        url: '/ai-analysis/health',
      });
    },

    checkNotificationService: async (): Promise<ApiResponse<HealthCheck>> => {
      return this.request<HealthCheck>({
        method: 'GET',
        url: '/notifications/health',
      });
    },

    checkAnalyticsService: async (): Promise<ApiResponse<HealthCheck>> => {
      return this.request<HealthCheck>({
        method: 'GET',
        url: '/analytics/health',
      });
    },

    checkRealtimeService: async (): Promise<ApiResponse<HealthCheck>> => {
      return this.request<HealthCheck>({
        method: 'GET',
        url: '/realtime/health',
      });
    },

    checkAllServices: async (): Promise<
      Record<string, ApiResponse<HealthCheck>>
    > => {
      const services = [
        'apiGateway',
        'userService',
        'problemService',
        'codeExecutionService',
        'aiAnalysisService',
        'notificationService',
        'analyticsService',
        'realtimeService',
      ];

      const results: Record<string, ApiResponse<HealthCheck>> = {};

      await Promise.allSettled(
        services.map(async service => {
          try {
            results[service] = await (this.health as any)[
              `check${service.charAt(0).toUpperCase() + service.slice(1)}`
            ]();
          } catch (error) {
            results[service] = {
              success: false,
              error: {
                code: 'HEALTH_CHECK_FAILED',
                message: `Failed to check ${service} health`,
              },
            };
          }
        })
      );

      return results;
    },
  };
}

// ============================================================================
// Custom Error Class
// ============================================================================

class ApiError extends Error {
  public status?: number;
  public code?: string;
  public details?: Record<string, any>;

  constructor(
    message: string,
    status?: number,
    code?: string,
    details?: Record<string, any>
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

export function createApiClient(config: ApiClientConfig): ApiClient {
  return new ApiClient(config);
}

export function isApiError(error: any): error is ApiError {
  return error instanceof ApiError;
}

// ============================================================================
// Default Export
// ============================================================================

export default ApiClient;
