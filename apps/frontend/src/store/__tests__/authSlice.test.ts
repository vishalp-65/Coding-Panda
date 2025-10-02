import { describe, it, expect } from 'vitest'
import authReducer, { clearError, setCredentials } from '../slices/authSlice'

describe('authSlice', () => {
    const initialState = {
        user: null,
        token: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
    }

    it('should return the initial state', () => {
        expect(authReducer(undefined, { type: 'unknown' })).toEqual(initialState)
    })

    it('should handle clearError', () => {
        const previousState = {
            ...initialState,
            error: 'Some error message',
        }

        expect(authReducer(previousState, clearError())).toEqual({
            ...previousState,
            error: null,
        })
    })

    it('should handle setCredentials', () => {
        const user = {
            id: '1',
            email: 'test@example.com',
            username: 'testuser',
            profile: {},
            preferences: { theme: 'light' as const, language: 'en', notifications: true },
            roles: ['user'],
            createdAt: '2024-01-01',
            updatedAt: '2024-01-01',
        }

        const token = 'test-token'

        expect(authReducer(initialState, setCredentials({ user, token }))).toEqual({
            ...initialState,
            user,
            token,
            isAuthenticated: true,
        })
    })
})