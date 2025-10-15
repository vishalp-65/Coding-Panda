import { useEffect, useRef, useCallback } from 'react';
import { useSelector } from 'react-redux';
import webSocketService, { WebSocketEvents } from '../services/websocket';

interface UseWebSocketOptions {
    autoConnect?: boolean;
    reconnectOnTokenChange?: boolean;
}

export const useWebSocket = (options: UseWebSocketOptions = {}) => {
    const { autoConnect = true, reconnectOnTokenChange = true } = options;
    const token = useSelector((state: any) => state.auth.token);
    const isConnectedRef = useRef(false);
    const tokenRef = useRef(token);

    const connect = useCallback(async () => {
        if (!token || isConnectedRef.current) return;

        try {
            const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:8080';
            await webSocketService.connect({
                url: socketUrl,
                token,
            });
            isConnectedRef.current = true;
        } catch (error) {
            console.error('Failed to connect to WebSocket:', error);
            isConnectedRef.current = false;
        }
    }, [token]);

    const disconnect = useCallback(() => {
        webSocketService.disconnect();
        isConnectedRef.current = false;
    }, []);

    // Auto-connect when component mounts
    useEffect(() => {
        if (autoConnect && token && !isConnectedRef.current) {
            connect();
        }

        return () => {
            if (autoConnect) {
                disconnect();
            }
        };
    }, [autoConnect, token, connect, disconnect]);

    // Reconnect when token changes
    useEffect(() => {
        if (reconnectOnTokenChange && token !== tokenRef.current) {
            tokenRef.current = token;

            if (isConnectedRef.current) {
                disconnect();
            }

            if (token) {
                connect();
            }
        }
    }, [token, reconnectOnTokenChange, connect, disconnect]);

    const on = useCallback(<K extends keyof WebSocketEvents>(
        event: K,
        callback: WebSocketEvents[K]
    ) => {
        webSocketService.on(event, callback);
    }, []);

    const off = useCallback(<K extends keyof WebSocketEvents>(
        event: K,
        callback?: WebSocketEvents[K]
    ) => {
        webSocketService.off(event, callback);
    }, []);

    return {
        connect,
        disconnect,
        on,
        off,
        isConnected: () => webSocketService.isConnected(),
        getConnectionState: () => webSocketService.getConnectionState(),

        // Contest methods
        joinContest: (contestId: string) => webSocketService.joinContest(contestId),
        leaveContest: (contestId: string) => webSocketService.leaveContest(contestId),

        // Collaboration methods
        joinCollaborationSession: (sessionId: string) => webSocketService.joinCollaborationSession(sessionId),
        leaveCollaborationSession: (sessionId: string) => webSocketService.leaveCollaborationSession(sessionId),
        sendCodeChange: (sessionId: string, code: string, language: string) =>
            webSocketService.sendCodeChange(sessionId, code, language),
        sendCursorPosition: (sessionId: string, position: { line: number; column: number }) =>
            webSocketService.sendCursorPosition(sessionId, position),
        sendChatMessage: (sessionId: string, message: string) =>
            webSocketService.sendChatMessage(sessionId, message),

        // Problem methods
        subscribeToSubmissionResults: (problemId: string) =>
            webSocketService.subscribeToSubmissionResults(problemId),
        unsubscribeFromSubmissionResults: (problemId: string) =>
            webSocketService.unsubscribeFromSubmissionResults(problemId),

        // Notification methods
        markNotificationAsRead: (notificationId: string) =>
            webSocketService.markNotificationAsRead(notificationId),
    };
};

export default useWebSocket;