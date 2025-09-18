import axios, { AxiosInstance, AxiosResponse } from 'axios';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

class ApiClient {
  private client: AxiosInstance;
  private store: any = null;
  private refreshAccessToken: any = null;

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
          originalRequest._retry = true;

          try {
            await this.store.dispatch(this.refreshAccessToken());
            const newToken = this.store.getState().auth.token;
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return this.client(originalRequest);
          } catch (refreshError) {
            // Refresh failed, redirect to login
            window.location.href = '/login';
            return Promise.reject(refreshError);
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

  register: async (userData: { email: string; username: string; password: string }) => {
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
    apiClient.get<{ problems: any[]; totalCount: number }>(
      '/problems/search',
      criteria
    ),

  getProblem: (id: string) => apiClient.get<any>(`/problems/${id}`),

  getRecommendedProblems: () => apiClient.get<any[]>('/problems/recommended'),

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
};

export default apiClient;
