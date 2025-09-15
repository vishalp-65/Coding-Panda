import { store } from '@/store'
import { refreshAccessToken } from '@/store/slices/authSlice'
import { addNotification } from '@/store/slices/uiSlice'
import apiClient from './api'
import socketService from './socket'

// Initialize the API client with store and refresh function
apiClient.setStoreAndRefresh(store, refreshAccessToken)

// Initialize the socket service with store and actions
socketService.setStoreAndActions(store, addNotification)

export default apiClient