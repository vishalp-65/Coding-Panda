import { useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from './redux';
import { refreshAccessToken, logout } from '@/store/slices/authSlice';
import { TokenManager } from '@/utils/tokenManager';

export const useTokenRefresh = () => {
    const dispatch = useAppDispatch();
    const { token, refreshToken, isAuthenticated } = useAppSelector(
        state => state.auth
    );
    const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isRefreshingRef = useRef(false);

    useEffect(() => {
        if (!isAuthenticated || !token || !refreshToken) {
            // Clear any existing timeout
            if (refreshTimeoutRef.current) {
                clearTimeout(refreshTimeoutRef.current);
                refreshTimeoutRef.current = null;
            }
            return;
        }

        const scheduleTokenRefresh = () => {
            // Clear any existing timeout
            if (refreshTimeoutRef.current) {
                clearTimeout(refreshTimeoutRef.current);
            }

            const timestamp = localStorage.getItem('tokenTimestamp');
            const expiresIn = localStorage.getItem('expiresIn');

            if (!timestamp || !expiresIn) {
                return;
            }

            const tokenAge = Date.now() - parseInt(timestamp);
            const expirationTime = parseInt(expiresIn) * 1000; // Convert to milliseconds

            // Schedule refresh at 80% of token lifetime
            const refreshTime = expirationTime * 0.8 - tokenAge;

            if (refreshTime > 0) {
                refreshTimeoutRef.current = setTimeout(async () => {
                    if (isRefreshingRef.current) {
                        return;
                    }

                    isRefreshingRef.current = true;

                    try {
                        const result = await dispatch(refreshAccessToken());

                        if (result.type.endsWith('/rejected')) {
                            // Refresh failed, logout user
                            dispatch(logout());
                        } else {
                            // Schedule next refresh
                            scheduleTokenRefresh();
                        }
                    } catch (error) {
                        console.error('Token refresh failed:', error);
                        dispatch(logout());
                    } finally {
                        isRefreshingRef.current = false;
                    }
                }, refreshTime);
            } else if (!TokenManager.isTokenExpired()) {
                // Token is close to expiring, refresh immediately
                if (!isRefreshingRef.current) {
                    isRefreshingRef.current = true;
                    dispatch(refreshAccessToken()).finally(() => {
                        isRefreshingRef.current = false;
                        scheduleTokenRefresh();
                    });
                }
            }
        };

        scheduleTokenRefresh();

        return () => {
            if (refreshTimeoutRef.current) {
                clearTimeout(refreshTimeoutRef.current);
            }
        };
    }, [dispatch, token, refreshToken, isAuthenticated]);

    // Handle page visibility change to refresh token when page becomes visible
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && isAuthenticated && token) {
                // Check if refresh token is expired first
                if (TokenManager.isRefreshTokenExpired()) {
                    dispatch(logout());
                    return;
                }

                // Check if token needs refresh when page becomes visible
                if (TokenManager.isTokenExpired() && !isRefreshingRef.current) {
                    isRefreshingRef.current = true;
                    dispatch(refreshAccessToken()).finally(() => {
                        isRefreshingRef.current = false;
                    });
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [dispatch, isAuthenticated, token]);
};