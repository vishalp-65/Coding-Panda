import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from './redux';
import { getCurrentUser } from '@/store/slices/authSlice';
import { useTokenRefresh } from './useTokenRefresh';

export const useAuth = () => {
  const dispatch = useAppDispatch();
  const { user, token, isAuthenticated, isLoading } = useAppSelector(
    state => state.auth
  );

  // Handle automatic token refresh
  useTokenRefresh();

  useEffect(() => {
    // Check if we have a token but no user data
    if (token && !user && !isLoading) {
      dispatch(getCurrentUser());
    }
  }, [dispatch, token, user, isLoading]);

  return {
    user,
    isAuthenticated,
    isLoading,
  };
};
