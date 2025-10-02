import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { authApi } from '@/services/api'

export interface User {
    id: string
    email: string
    username: string
    profile: {
        firstName?: string
        lastName?: string
        avatar?: string
        bio?: string
    }
    preferences: {
        theme: 'light' | 'dark'
        language: string
        notifications: boolean
    }
    roles: string[]
    createdAt: string
    updatedAt: string
}

interface AuthState {
    user: User | null
    token: string | null
    refreshToken: string | null
    isAuthenticated: boolean
    isLoading: boolean
    error: string | null
}

const initialState: AuthState = {
    user: null,
    token: localStorage.getItem('token'),
    refreshToken: localStorage.getItem('refreshToken'),
    isAuthenticated: !!localStorage.getItem('token'),
    isLoading: false,
    error: null,
}

export const login = createAsyncThunk(
    'auth/login',
    async (credentials: { email: string; password: string }) => {
        const response = await authApi.login(credentials)
        localStorage.setItem('token', response.token)
        localStorage.setItem('refreshToken', response.refreshToken)
        return response
    }
)

export const register = createAsyncThunk(
    'auth/register',
    async (userData: { email: string; username: string; password: string }) => {
        const response = await authApi.register(userData)
        localStorage.setItem('token', response.token)
        localStorage.setItem('refreshToken', response.refreshToken)
        return response
    }
)

export const refreshAccessToken = createAsyncThunk(
    'auth/refreshToken',
    async (_, { getState }) => {
        const state = getState() as { auth: AuthState }
        if (!state.auth.refreshToken) {
            throw new Error('No refresh token available')
        }
        const response = await authApi.refreshToken(state.auth.refreshToken)
        localStorage.setItem('token', response.token)
        return response
    }
)

export const getCurrentUser = createAsyncThunk(
    'auth/getCurrentUser',
    async () => {
        const response = await authApi.getCurrentUser()
        return response
    }
)

export const logout = createAsyncThunk(
    'auth/logout',
    async () => {
        await authApi.logout()
        localStorage.removeItem('token')
        localStorage.removeItem('refreshToken')
    }
)

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        clearError: (state) => {
            state.error = null
        },
        setCredentials: (state, action: PayloadAction<{ user: User; token: string }>) => {
            state.user = action.payload.user
            state.token = action.payload.token
            state.isAuthenticated = true
        },
    },
    extraReducers: (builder) => {
        builder
            // Login
            .addCase(login.pending, (state) => {
                state.isLoading = true
                state.error = null
            })
            .addCase(login.fulfilled, (state, action) => {
                state.isLoading = false
                state.user = action.payload.user
                state.token = action.payload.token
                state.refreshToken = action.payload.refreshToken
                state.isAuthenticated = true
            })
            .addCase(login.rejected, (state, action) => {
                state.isLoading = false
                state.error = action.error.message || 'Login failed'
            })
            // Register
            .addCase(register.pending, (state) => {
                state.isLoading = true
                state.error = null
            })
            .addCase(register.fulfilled, (state, action) => {
                state.isLoading = false
                state.user = action.payload.user
                state.token = action.payload.token
                state.refreshToken = action.payload.refreshToken
                state.isAuthenticated = true
            })
            .addCase(register.rejected, (state, action) => {
                state.isLoading = false
                state.error = action.error.message || 'Registration failed'
            })
            // Refresh token
            .addCase(refreshAccessToken.fulfilled, (state, action) => {
                state.token = action.payload.token
            })
            // Get current user
            .addCase(getCurrentUser.fulfilled, (state, action) => {
                state.user = action.payload
                state.isAuthenticated = true
            })
            .addCase(getCurrentUser.rejected, (state) => {
                state.user = null
                state.token = null
                state.refreshToken = null
                state.isAuthenticated = false
                localStorage.removeItem('token')
                localStorage.removeItem('refreshToken')
            })
            // Logout
            .addCase(logout.fulfilled, (state) => {
                state.user = null
                state.token = null
                state.refreshToken = null
                state.isAuthenticated = false
            })
    },
})

export const { clearError, setCredentials } = authSlice.actions
export default authSlice.reducer