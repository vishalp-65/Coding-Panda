import { configureStore } from '@reduxjs/toolkit'
import authReducer, { refreshAccessToken } from './slices/authSlice'
import problemsReducer from './slices/problemsSlice'
import uiReducer from './slices/uiSlice'
import apiClient from '@/services/api'

export const store = configureStore({
    reducer: {
        auth: authReducer,
        problems: problemsReducer,
        ui: uiReducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: {
                ignoredActions: ['persist/PERSIST'],
            },
        }),
})

// Set up API client with store and refresh function
apiClient.setStoreAndRefresh(store, refreshAccessToken)

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch