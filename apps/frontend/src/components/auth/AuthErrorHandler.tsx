import { useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '@/hooks/redux';
import { clearError } from '@/store/slices/authSlice';
import { toast } from 'react-hot-toast';

export const AuthErrorHandler = () => {
    const dispatch = useAppDispatch();
    const { error } = useAppSelector(state => state.auth);

    useEffect(() => {
        if (error && error !== 'REFRESH_TOKEN_EXPIRED') {
            // Show error toast for authentication errors (except expired refresh tokens)
            toast.error(error);

            // Clear the error after showing it
            dispatch(clearError());
        }
    }, [error, dispatch]);

    return null; // This component doesn't render anything
};