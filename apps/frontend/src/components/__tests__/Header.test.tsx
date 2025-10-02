import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'
import { configureStore } from '@reduxjs/toolkit'
import Header from '../layout/Header'
import authReducer from '../../store/slices/authSlice'
import uiReducer from '../../store/slices/uiSlice'

const createMockStore = (initialState: any) => {
  return configureStore({
    reducer: {
      auth: authReducer,
      ui: uiReducer,
    },
    preloadedState: initialState,
  })
}

const renderWithProviders = (component: React.ReactElement, initialState: any) => {
  const store = createMockStore(initialState)
  return render(
    <Provider store={store}>
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </Provider>
  )
}

describe('Header', () => {
  const mockUser = {
    id: '1',
    email: 'test@example.com',
    username: 'testuser',
    profile: {},
    preferences: { theme: 'light' as const, language: 'en', notifications: true },
    roles: ['user'],
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  }

  it('renders with authenticated user', () => {
    const initialState = {
      auth: {
        user: mockUser,
        token: 'test-token',
        refreshToken: null,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      },
      ui: {
        theme: 'light' as const,
        sidebarOpen: true,
        notifications: [],
        isOnline: true,
      },
    }

    renderWithProviders(<Header />, initialState)

    expect(screen.getByText('AI Coding Platform')).toBeInTheDocument()
    expect(screen.getByText('testuser')).toBeInTheDocument()
  })

  it('shows notification count when notifications exist', () => {
    const initialState = {
      auth: {
        user: mockUser,
        token: 'test-token',
        refreshToken: null,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      },
      ui: {
        theme: 'light' as const,
        sidebarOpen: true,
        notifications: [
          { id: '1', type: 'info' as const, message: 'Test notification', timestamp: Date.now() },
        ],
        isOnline: true,
      },
    }

    renderWithProviders(<Header />, initialState)

    expect(screen.getByText('1')).toBeInTheDocument()
  })
})