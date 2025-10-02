import { io, Socket } from 'socket.io-client'

class SocketService {
    private socket: Socket | null = null
    private reconnectAttempts = 0
    private maxReconnectAttempts = 5
    private store: any = null
    private addNotification: any = null

    // Method to set store and actions after they're available
    setStoreAndActions(store: any, addNotification: any) {
        this.store = store
        this.addNotification = addNotification
    }

    connect() {
        if (!this.store) return
        const token = this.store.getState().auth.token
        if (!token) return

        this.socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:8080', {
            auth: {
                token,
            },
            transports: ['websocket'],
        })

        this.setupEventListeners()
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect()
            this.socket = null
        }
    }

    private setupEventListeners() {
        if (!this.socket) return

        this.socket.on('connect', () => {
            console.log('Connected to server')
            this.reconnectAttempts = 0
            if (this.store && this.addNotification) {
                this.store.dispatch(this.addNotification({
                    type: 'success',
                    message: 'Connected to real-time services',
                }))
            }
        })

        this.socket.on('disconnect', (reason) => {
            console.log('Disconnected from server:', reason)
            if (reason === 'io server disconnect') {
                // Server initiated disconnect, try to reconnect
                this.handleReconnect()
            }
        })

        this.socket.on('connect_error', (error) => {
            console.error('Connection error:', error)
            this.handleReconnect()
        })

        // Real-time notifications
        this.socket.on('notification', (data) => {
            if (this.store && this.addNotification) {
                this.store.dispatch(this.addNotification({
                    type: data.type || 'info',
                    message: data.message,
                }))
            }
        })

        // Contest updates
        this.socket.on('contest_update', (data) => {
            // Handle contest leaderboard updates
            console.log('Contest update:', data)
        })

        // Collaboration events
        this.socket.on('code_change', (data) => {
            // Handle collaborative code editing
            console.log('Code change:', data)
        })
    }

    private handleReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++
            setTimeout(() => {
                console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
                this.connect()
            }, Math.pow(2, this.reconnectAttempts) * 1000) // Exponential backoff
        } else {
            if (this.store && this.addNotification) {
                this.store.dispatch(this.addNotification({
                    type: 'error',
                    message: 'Failed to connect to real-time services',
                }))
            }
        }
    }

    // Public methods for emitting events
    joinRoom(room: string) {
        this.socket?.emit('join_room', { room })
    }

    leaveRoom(room: string) {
        this.socket?.emit('leave_room', { room })
    }

    sendMessage(room: string, message: string) {
        this.socket?.emit('message', { room, message })
    }

    updateCode(room: string, code: string, language: string) {
        this.socket?.emit('code_update', { room, code, language })
    }

    // Event listeners for specific features
    onCodeChange(callback: (data: { code: string; language: string; userId: string }) => void) {
        this.socket?.on('code_change', callback)
    }

    onUserJoined(callback: (data: { userId: string; username: string }) => void) {
        this.socket?.on('user_joined', callback)
    }

    onUserLeft(callback: (data: { userId: string; username: string }) => void) {
        this.socket?.on('user_left', callback)
    }

    onContestUpdate(callback: (data: any) => void) {
        this.socket?.on('contest_update', callback)
    }

    // Remove event listeners
    off(event: string, callback?: (...args: any[]) => void) {
        this.socket?.off(event, callback)
    }
}

export const socketService = new SocketService()
export default socketService