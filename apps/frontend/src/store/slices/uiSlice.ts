import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface UiState {
    theme: 'light' | 'dark'
    sidebarOpen: boolean
    notifications: Array<{
        id: string
        type: 'success' | 'error' | 'warning' | 'info'
        message: string
        timestamp: number
    }>
    isOnline: boolean
}

const initialState: UiState = {
    theme: (localStorage.getItem('theme') as 'light' | 'dark') || 'light',
    sidebarOpen: true,
    notifications: [],
    isOnline: navigator.onLine,
}

const uiSlice = createSlice({
    name: 'ui',
    initialState,
    reducers: {
        setTheme: (state, action: PayloadAction<'light' | 'dark'>) => {
            state.theme = action.payload
            localStorage.setItem('theme', action.payload)
        },
        toggleSidebar: (state) => {
            state.sidebarOpen = !state.sidebarOpen
        },
        setSidebarOpen: (state, action: PayloadAction<boolean>) => {
            state.sidebarOpen = action.payload
        },
        addNotification: (state, action: PayloadAction<{
            type: 'success' | 'error' | 'warning' | 'info'
            message: string
        }>) => {
            const notification = {
                id: Date.now().toString(),
                ...action.payload,
                timestamp: Date.now(),
            }
            state.notifications.push(notification)
        },
        removeNotification: (state, action: PayloadAction<string>) => {
            state.notifications = state.notifications.filter(
                notification => notification.id !== action.payload
            )
        },
        clearNotifications: (state) => {
            state.notifications = []
        },
        setOnlineStatus: (state, action: PayloadAction<boolean>) => {
            state.isOnline = action.payload
        },
    },
})

export const {
    setTheme,
    toggleSidebar,
    setSidebarOpen,
    addNotification,
    removeNotification,
    clearNotifications,
    setOnlineStatus,
} = uiSlice.actions

export default uiSlice.reducer