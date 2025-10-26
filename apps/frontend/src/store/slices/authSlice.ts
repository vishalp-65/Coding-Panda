import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { authApi } from '@/services/api';
import { TokenManager } from '@/utils/tokenManager';

export interface User {
  id: string;
  email: string;
  username: string;
  profile: {
    firstName?: string;
    avatar?: string;
    lastName?: string;
    bio?: string;
    skillLevel: 'beginner' | 'intermediate' | 'advanced';
    programmingLanguages: string[];
  };
  preferences: {
    theme: 'light' | 'dark' | 'system';
    language: string;
    timezone: string;
    notifications: boolean;
    privacySettings: {
      showEmail: boolean;
      showLocation: boolean;
      showRealName: boolean;
      profileVisibility: 'public' | 'private';
      allowDirectMessages: boolean;
    };
    emailNotifications: {
      newProblems: boolean;
      weeklyDigest: boolean;
      socialActivity: boolean;
      contestReminders: boolean;
      achievementUnlocked: boolean;
    };
  };
  roles: string[];
  isEmailVerified: boolean;
  twoFactorEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  stats: {
    userId: string;
    totalSubmissions: number;
    acceptedSubmissions: number;
    acceptanceRate: string;
    problemsSolved: number;
    contestsParticipated: number;
    ranking: number;
    streak: number;
    longestStreak: number;
    skillRatings: Record<string, number>;
    updatedAt: string;
  };
}

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  expiresIn: number | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  token: TokenManager.getAccessToken(),
  refreshToken: TokenManager.getRefreshToken(),
  expiresIn: null,
  isAuthenticated: TokenManager.hasValidToken(),
  isLoading: false,
  error: null,
};

export const login = createAsyncThunk(
  'auth/login',
  async (credentials: { email: string; password: string }) => {
    const response = await authApi.login(credentials);

    // Store tokens in localStorage
    TokenManager.setTokens(
      response.accessToken,
      response.refreshToken,
      response.expiresIn
    );

    return response;
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async (userData: { email: string; username: string; password: string }) => {
    const response = await authApi.register(userData);

    // Store tokens in localStorage
    TokenManager.setTokens(
      response.accessToken,
      response.refreshToken,
      response.expiresIn
    );

    return response;
  }
);

export const refreshAccessToken = createAsyncThunk(
  'auth/refreshToken',
  async (_, { getState, rejectWithValue }) => {
    const state = getState() as { auth: AuthState };
    let refreshToken =
      state.auth.refreshToken || TokenManager.getRefreshToken();

    if (!refreshToken) {
      TokenManager.clearTokens();
      return rejectWithValue('No refresh token available');
    }

    try {
      const response = await authApi.refreshToken(refreshToken);

      // Store the new tokens
      TokenManager.setTokens(
        response.accessToken,
        response.refreshToken || refreshToken, // Use new refresh token if provided, otherwise keep the old one
        response.expiresIn
      );

      return response;
    } catch (error: any) {
      // If refresh fails, clear all tokens
      TokenManager.clearTokens();

      // Check if it's a TOKEN_REFRESH_FAILED error
      if (error.response?.data?.error?.code === 'TOKEN_REFRESH_FAILED') {
        return rejectWithValue('REFRESH_TOKEN_EXPIRED');
      }

      return rejectWithValue(error.message || 'Token refresh failed');
    }
  }
);

export const getCurrentUser = createAsyncThunk(
  'auth/getCurrentUser',
  async () => {
    const response = await authApi.getCurrentUser();
    return response;
  }
);

export const logout = createAsyncThunk('auth/logout', async () => {
  await authApi.logout();
  TokenManager.clearTokens();
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: state => {
      state.error = null;
    },
    setCredentials: (
      state,
      action: PayloadAction<{
        user: User;
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
      }>
    ) => {
      state.user = action.payload.user;
      state.token = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      state.expiresIn = action.payload.expiresIn;
      state.isAuthenticated = true;
    },
  },
  extraReducers: builder => {
    builder
      // Login
      .addCase(login.pending, state => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
        state.expiresIn = action.payload.expiresIn;
        state.isAuthenticated = true;
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Login failed';
      })
      // Register
      .addCase(register.pending, state => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
        state.expiresIn = action.payload.expiresIn;
        state.isAuthenticated = true;
      })
      .addCase(register.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Registration failed';
      })
      // Refresh token
      .addCase(refreshAccessToken.pending, state => {
        state.error = null;
      })
      .addCase(refreshAccessToken.fulfilled, (state, action) => {
        state.token = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken || state.refreshToken;
        state.expiresIn = action.payload.expiresIn;
        state.user = action.payload.user || state.user;
        state.isAuthenticated = true;
      })
      .addCase(refreshAccessToken.rejected, (state, action) => {
        state.user = null;
        state.token = null;
        state.refreshToken = null;
        state.expiresIn = null;
        state.isAuthenticated = false;

        // Don't set error for expired refresh tokens to avoid showing error messages
        if (action.payload !== 'REFRESH_TOKEN_EXPIRED') {
          state.error = (action.payload as string) || 'Token refresh failed';
        }
      })
      // Get current user
      .addCase(getCurrentUser.fulfilled, (state, action) => {
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(getCurrentUser.rejected, state => {
        state.user = null;
        state.token = null;
        state.refreshToken = null;
        state.expiresIn = null;
        state.isAuthenticated = false;
        TokenManager.clearTokens();
      })
      // Logout
      .addCase(logout.fulfilled, state => {
        state.user = null;
        state.token = null;
        state.refreshToken = null;
        state.expiresIn = null;
        state.isAuthenticated = false;
      });
  },
});

export const { clearError, setCredentials } = authSlice.actions;
export default authSlice.reducer;
