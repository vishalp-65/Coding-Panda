import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from './redux';
import { refreshAccessToken, getCurrentUser } from '@/store/slices/authSlice';
import { TokenManager } from '@/utils/tokenManager';

export const useAuth = () => {
  const dispatch = useAppDispatch();
  const { user, token, isAuthenticated, isLoading } = useAppSelector(
    state => state.auth
  );

  useEffect(() => {
    // Check if we have a token but no user data
    if (token && !user && !isLoading) {
      dispatch(getCurrentUser());
    }

    // Set up token refresh interval
    // const checkTokenExpiration = () => {
    //     if (token && TokenManager.isTokenExpired()) {
    //         dispatch(refreshAccessToken());
    //     }
    // };

    // // Check immediately
    // checkTokenExpiration();

    // // Check every 5 minutes
    // const interval = setInterval(checkTokenExpiration, 5 * 60 * 1000);

    // return () => clearInterval(interval);
  }, [dispatch, token, user, isLoading]);

  return {
    user,
    isAuthenticated,
    isLoading,
  };
};
