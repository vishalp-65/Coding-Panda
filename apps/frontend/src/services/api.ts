import axios, { AxiosInstance, AxiosResponse } from 'axios';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

class ApiClient {
  private client: AxiosInstance;
  private store: any = null;
  private refreshAccessToken: any = null;
  private isRefreshing = false;
  private failedQueue: Array<{
    resolve: (value?: any) => void;
    reject: (error?: any) => void;
  }> = [];
  private refreshFailureCount = 0;
  private maxRefreshAttempts = 3;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  // Method to set store and refresh function after they're available
  setStoreAndRefresh(store: any, refreshAccessToken: any) {
    this.store = store;
    this.refreshAccessToken = refreshAccessToken;
  }

  private processQueue(error: any, token: string | null = null) {
    this.failedQueue.forEach(({ resolve, reject }) => {
      if (error) {
        reject(error);
      } else {
        resolve(token);
      }
    });

    this.failedQueue = [];
  }

  private setupInterceptors() {
    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      config => {
        if (this.store) {
          const token = this.store.getState().auth.token;
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        }
        return config;
      },
      error => Promise.reject(error)
    );

    // Response interceptor to handle token refresh
    this.client.interceptors.response.use(
      response => response,
      async error => {
        const originalRequest = error.config;

        if (
          error.response?.status === 401 &&
          !originalRequest._retry &&
          this.store &&
          this.refreshAccessToken
        ) {
          // Check if this is a refresh token request that failed
          if (originalRequest.url?.includes('/auth/refresh-token')) {
            // Refresh token is invalid, clear auth and redirect
            this.store.dispatch({ type: 'auth/logout/fulfilled' });
            window.location.href = '/login';
            return Promise.reject(error);
          }

          if (this.isRefreshing) {
            // If already refreshing, queue this request
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject });
            }).then(token => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              return this.client(originalRequest);
            }).catch(err => {
              return Promise.reject(err);
            });
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            // Check if we've exceeded max refresh attempts
            if (this.refreshFailureCount >= this.maxRefreshAttempts) {
              throw new Error('Max refresh attempts exceeded');
            }

            const refreshResult = await this.store.dispatch(this.refreshAccessToken());

            if (refreshResult.type.endsWith('/fulfilled')) {
              // Reset failure count on successful refresh
              this.refreshFailureCount = 0;
              const newToken = this.store.getState().auth.token;
              this.processQueue(null, newToken);
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              return this.client(originalRequest);
            } else {
              // Refresh failed
              this.refreshFailureCount++;
              throw new Error('Token refresh failed');
            }
          } catch (refreshError) {
            this.refreshFailureCount++;
            this.processQueue(refreshError, null);
            // Clear auth state and redirect to login
            this.store.dispatch({ type: 'auth/logout/fulfilled' });
            window.location.href = '/login';
            return Promise.reject(refreshError);
          } finally {
            this.isRefreshing = false;
          }
        }

        return Promise.reject(error);
      }
    );
  }

  async get<T>(url: string, params?: any): Promise<T> {
    const response: AxiosResponse<T> = await this.client.get(url, { params });
    return response.data;
  }

  async post<T>(url: string, data?: any): Promise<T> {
    const response: AxiosResponse<T> = await this.client.post(url, data);
    return response.data;
  }

  async put<T>(url: string, data?: any): Promise<T> {
    const response: AxiosResponse<T> = await this.client.put(url, data);
    return response.data;
  }

  async delete<T>(url: string): Promise<T> {
    const response: AxiosResponse<T> = await this.client.delete(url);
    return response.data;
  }
}

const apiClient = new ApiClient();

// Auth API
export const authApi = {
  login: async (credentials: { email: string; password: string }) => {
    const response = await apiClient.post<{
      success: boolean;
      data: {
        user: any;
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
      };
      message: string;
    }>('/users/auth/login', credentials);
    return response.data;
  },

  register: async (userData: {
    email: string;
    username: string;
    password: string;
  }) => {
    const response = await apiClient.post<{
      success: boolean;
      data: {
        user: any;
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
      };
      message: string;
    }>('/users/auth/register', userData);
    return response.data;
  },

  refreshToken: async (refreshToken: string) => {
    const response = await apiClient.post<{
      success: boolean;
      data: {
        user: any;
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
      };
      message: string;
    }>('/users/auth/refresh-token', { refreshToken });
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await apiClient.get<{
      success: boolean;
      data: {
        user: any;
      };
    }>('/users/auth/me');
    return response.data.user;
  },

  logout: () => apiClient.post('/users/auth/logout'),

  updateProfile: (profileData: any) =>
    apiClient.put('/users/profile', profileData),

  requestPasswordReset: (email: string) =>
    apiClient.post('/users/password-reset/request', { email }),

  resetPassword: (token: string, password: string) =>
    apiClient.post('/users/password-reset/reset', { token, password }),

  validateResetToken: (token: string) =>
    apiClient.get(`/users/password-reset/validate-token?token=${token}`),
};

// Problems API
export const problemsApi = {
  searchProblems: (criteria: any) =>
    apiClient.get<{ data: any[]; totalCount: number }>(
      '/problems/search',
      criteria
    ),

  getProblem: (id: string) => apiClient.get<any>(`/problems/${id}`),

  getRecommendedProblems: () =>
    apiClient.get<any[]>('/problems/search', { sortBy: 'title' }),

  bookmarkProblem: (problemId: string) =>
    apiClient.post(`/problems/${problemId}/bookmark`),

  unbookmarkProblem: (problemId: string) =>
    apiClient.delete(`/problems/${problemId}/bookmark`),

  submitSolution: (
    problemId: string,
    solution: { code: string; language: string }
  ) => apiClient.post(`/problems/${problemId}/submit`, solution),

  getSubmissions: (problemId?: string) =>
    apiClient.get('/submissions', { problemId }),

  // Code execution API
  executeCode: (data: {
    code: string;
    language: string;
    hidden_code: string;
    test_cases: Array<{
      input: string;
      expected_output: string;
      is_hidden: boolean;
    }>;
    time_limit: number;
    memory_limit: number;
    problem_id: string;
    user_id: string;
  }) => apiClient.post<any>('/execution/execute', data),

  // Template API
  getTemplate: (problemId: string, language: string) =>
    apiClient.get<{ template: string; hidden_code: string }>(
      `/problems/${problemId}/template?language=${language}`
    ),

  // Get problem template with full structure (like GFG)
  getProblemTemplate: (problemId: string, language: string) =>
    apiClient.get<{
      success: boolean;
      data: {
        userEditableRegion: string;
        hiddenCode: string;
        functionSignature: string;
        imports: string;
        helperClasses: string;
        language: string;
        problemId: string;
        problemTitle: string;
      };
    }>(`/problems/${problemId}/template?language=${language}`),

  // AI Analysis API
  getAIFeedback: (data: {
    code: string;
    language: string;
    problemId: string;
  }) => apiClient.post<any>('/ai-analysis/feedback', data),

  getHints: (data: {
    problemId: string;
    userCode?: string;
    currentHints?: any[];
  }) => apiClient.post<any>('/ai-analysis/hints', data),

  explainCode: (data: { code: string; language: string; problemId: string }) =>
    apiClient.post<any>('/ai-analysis/explain', data),
};

// Dashboard API
export const dashboardApi = {
  getDashboardStats: () => apiClient.get<any>('/users/dashboard/stats'),
  getRecentActivity: () => apiClient.get<any[]>('/users/dashboard/activity'),
};

// Analytics API
export const analyticsApi = {
  getUserStats: () => apiClient.get<any>('/analytics/user/stats'),
  getProgressData: () => apiClient.get<any>('/analytics/user/progress'),
};

// Contest API
export const contestApi = {
  getContests: (params?: any) => apiClient.get<any[]>('/contests', params),
  getContest: (id: string) => apiClient.get<any>(`/contests/${id}`),
  joinContest: (id: string) => apiClient.post(`/contests/${id}/join`),
  leaveContest: (id: string) => apiClient.post(`/contests/${id}/leave`),
  getLeaderboard: (id: string) =>
    apiClient.get<any>(`/contests/${id}/leaderboard`),
  getUserSubmissions: (id: string) =>
    apiClient.get<any[]>(`/contests/${id}/submissions`),
  getAnalytics: (id: string) => apiClient.get<any>(`/contests/${id}/analytics`),
};

// Collaboration API
export const collaborationApi = {
  createSession: (data: any) =>
    apiClient.post<any>('/collaboration/sessions', data),
  getSession: (id: string) =>
    apiClient.get<any>(`/collaboration/sessions/${id}`),
  joinSession: (id: string) =>
    apiClient.post(`/collaboration/sessions/${id}/join`),
  leaveSession: (id: string) =>
    apiClient.post(`/collaboration/sessions/${id}/leave`),
  updateSessionSettings: (id: string, settings: any) =>
    apiClient.put(`/collaboration/sessions/${id}/settings`, settings),
  getChatHistory: (sessionId: string) =>
    apiClient.get<any[]>(`/collaboration/sessions/${sessionId}/chat`),
};

// Interview API
export const interviewApi = {
  createSession: (data: any) => apiClient.post<any>('/interviews', data),
  getSession: (id: string) => apiClient.get<any>(`/interviews/${id}`),
  submitAnswer: (sessionId: string, questionId: string, answer: any) =>
    apiClient.post(
      `/interviews/${sessionId}/questions/${questionId}/answer`,
      answer
    ),
  getAIFeedback: (sessionId: string, questionId: string) =>
    apiClient.get<any>(
      `/interviews/${sessionId}/questions/${questionId}/feedback`
    ),
  endSession: (id: string) => apiClient.post(`/interviews/${id}/end`),
};

// Social API
export const socialApi = {
  followUser: (userId: string) => apiClient.post(`/social/follow/${userId}`),
  unfollowUser: (userId: string) =>
    apiClient.delete(`/social/follow/${userId}`),
  getFollowers: (userId: string) =>
    apiClient.get<any[]>(`/social/users/${userId}/followers`),
  getFollowing: (userId: string) =>
    apiClient.get<any[]>(`/social/users/${userId}/following`),
  getSuggestedUsers: () => apiClient.get<any[]>('/social/users/suggestions'),
  getActivityFeed: (params?: any) =>
    apiClient.get<any[]>('/social/activity', params),
  likeActivity: (activityId: string) =>
    apiClient.post(`/social/activity/${activityId}/like`),
  commentOnActivity: (activityId: string, comment: string) =>
    apiClient.post(`/social/activity/${activityId}/comment`, { comment }),
};

// Discussion API
export const discussionApi = {
  getThreads: (params?: any) => apiClient.get<any[]>('/discussions', params),
  getThread: (id: string) => apiClient.get<any>(`/discussions/${id}`),
  createThread: (data: any) => apiClient.post<any>('/discussions', data),
  replyToThread: (threadId: string, content: string) =>
    apiClient.post(`/discussions/${threadId}/replies`, { content }),
  voteOnThread: (threadId: string, voteType: 'up' | 'down') =>
    apiClient.post(`/discussions/${threadId}/vote`, { voteType }),
  voteOnReply: (replyId: string, voteType: 'up' | 'down') =>
    apiClient.post(`/discussions/replies/${replyId}/vote`, { voteType }),
};

export default apiClient;
