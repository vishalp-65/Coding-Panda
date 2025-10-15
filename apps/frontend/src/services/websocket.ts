import { io, Socket } from 'socket.io-client';

interface WebSocketConfig {
    url: string;
    token?: string;
}

interface WebSocketEvents {
    // Contest events
    'contest:joined': (data: any) => void;
    'contest:left': (data: any) => void;
    'contest:updated': (data: any) => void;
    'contest:leaderboard_updated': (data: any) => void;
    'contest:submission_result': (data: any) => void;

    // Problem events
    'problem:submission_result': (data: any) => void;
    'problem:test_result': (data: any) => void;

    // Collaboration events
    'collaboration:user_joined': (data: any) => void;
    'collaboration:user_left': (data: any) => void;
    'collaboration:code_changed': (data: any) => void;
    'collaboration:cursor_moved': (data: any) => void;
    'collaboration:chat_message': (data: any) => void;

    // Notification events
    'notification:new': (data: any) => void;
    'notification:read': (data: any) => void;

    // System events
    'system:maintenance': (data: any) => void;
    'system:announcement': (data: any) => void;

    // Connection events
    'connect': () => void;
    'disconnect': () => void;
    'connect_error': (error: Error) => void;
    'reconnect': () => void;
}

class WebSocketService {
    private socket: Socket | null = null;
    private config: WebSocketConfig | null = null;
    private eventListeners: Map<string, Function[]> = new Map();
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 1000;

    constructor() {
        this.handleConnectionEvents = this.handleConnectionEvents.bind(this);
    }

    connect(config: WebSocketConfig): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                this.config = config;

                this.socket = io(config.url, {
                    auth: {
                        token: config.token,
                    },
                    transports: ['websocket', 'polling'],
                    timeout: 20000,
                    reconnection: true,
                    reconnectionAttempts: this.maxReconnectAttempts,
                    reconnectionDelay: this.reconnectDelay,
                });

                this.handleConnectionEvents();

                this.socket.on('connect', () => {
                    console.log('WebSocket connected');
                    this.reconnectAttempts = 0;
                    resolve();
                });

                this.socket.on('connect_error', (error) => {
                    console.error('WebSocket connection error:', error);
                    reject(error);
                });

            } catch (error) {
                reject(error);
            }
        });
    }

    private handleConnectionEvents(): void {
        if (!this.socket) return;

        this.socket.on('connect', () => {
            console.log('WebSocket connected');
            this.reconnectAttempts = 0;
            this.emit('connect');
        });

        this.socket.on('disconnect', (reason) => {
            console.log('WebSocket disconnected:', reason);
            this.emit('disconnect');
        });

        this.socket.on('connect_error', (error) => {
            console.error('WebSocket connection error:', error);
            this.emit('connect_error', error);
        });

        this.socket.on('reconnect', (attemptNumber) => {
            console.log('WebSocket reconnected after', attemptNumber, 'attempts');
            this.emit('reconnect');
        });

        this.socket.on('reconnect_error', (error) => {
            console.error('WebSocket reconnection error:', error);
            this.reconnectAttempts++;
        });

        this.socket.on('reconnect_failed', () => {
            console.error('WebSocket reconnection failed after', this.maxReconnectAttempts, 'attempts');
        });
    }

    disconnect(): void {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        this.eventListeners.clear();
    }

    // Event handling
    on<K extends keyof WebSocketEvents>(event: K, callback: WebSocketEvents[K]): void {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event)!.push(callback);

        if (this.socket) {
            this.socket.on(event, callback);
        }
    }

    off<K extends keyof WebSocketEvents>(event: K, callback?: WebSocketEvents[K]): void {
        if (callback) {
            const listeners = this.eventListeners.get(event) || [];
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }

            if (this.socket) {
                this.socket.off(event, callback);
            }
        } else {
            this.eventListeners.delete(event);
            if (this.socket) {
                this.socket.off(event);
            }
        }
    }

    private emit(event: string, ...args: any[]): void {
        const listeners = this.eventListeners.get(event) || [];
        listeners.forEach(callback => {
            try {
                callback(...args);
            } catch (error) {
                console.error('Error in WebSocket event listener:', error);
            }
        });
    }

    // Contest methods
    joinContest(contestId: string): void {
        if (this.socket) {
            this.socket.emit('contest:join', { contestId });
        }
    }

    leaveContest(contestId: string): void {
        if (this.socket) {
            this.socket.emit('contest:leave', { contestId });
        }
    }

    // Collaboration methods
    joinCollaborationSession(sessionId: string): void {
        if (this.socket) {
            this.socket.emit('collaboration:join', { sessionId });
        }
    }

    leaveCollaborationSession(sessionId: string): void {
        if (this.socket) {
            this.socket.emit('collaboration:leave', { sessionId });
        }
    }

    sendCodeChange(sessionId: string, code: string, language: string): void {
        if (this.socket) {
            this.socket.emit('collaboration:code_change', {
                sessionId,
                code,
                language,
                timestamp: Date.now(),
            });
        }
    }

    sendCursorPosition(sessionId: string, position: { line: number; column: number }): void {
        if (this.socket) {
            this.socket.emit('collaboration:cursor_move', {
                sessionId,
                position,
                timestamp: Date.now(),
            });
        }
    }

    sendChatMessage(sessionId: string, message: string): void {
        if (this.socket) {
            this.socket.emit('collaboration:chat', {
                sessionId,
                message,
                timestamp: Date.now(),
            });
        }
    }

    // Problem methods
    subscribeToSubmissionResults(problemId: string): void {
        if (this.socket) {
            this.socket.emit('problem:subscribe', { problemId });
        }
    }

    unsubscribeFromSubmissionResults(problemId: string): void {
        if (this.socket) {
            this.socket.emit('problem:unsubscribe', { problemId });
        }
    }

    // Notification methods
    markNotificationAsRead(notificationId: string): void {
        if (this.socket) {
            this.socket.emit('notification:mark_read', { notificationId });
        }
    }

    // Utility methods
    isConnected(): boolean {
        return this.socket?.connected || false;
    }

    getConnectionState(): string {
        if (!this.socket) return 'disconnected';
        return this.socket.connected ? 'connected' : 'disconnected';
    }

    // Update authentication token
    updateToken(token: string): void {
        if (this.socket && this.config) {
            this.config.token = token;
            this.socket.auth = { token };
        }
    }
}

// Create singleton instance
const webSocketService = new WebSocketService();

export default webSocketService;
export type { WebSocketEvents, WebSocketConfig };