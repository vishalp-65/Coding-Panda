import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAppDispatch } from '@/hooks/redux';
import { useAuth } from '@/hooks/useAuth';
import { setOnlineStatus } from '@/store/slices/uiSlice';
import socketService from '@/services/socket';

// Layout components
import ModernLayout from '@/components/layout/ModernLayout';
import AuthLayout from '@/components/layout/AuthLayout';

// Page components
import HomePage from '@/pages/HomePage';
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage';
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage';
import ModernDashboardPage from '@/pages/ModernDashboardPage';
import ModernProblemsPage from '@/pages/problems/ModernProblemsPage';
import ModernProblemDetailPage from '@/pages/problems/ModernProblemDetailPage';
import ProfilePage from '@/pages/ProfilePage';
import SettingsPage from '@/pages/SettingsPage';
import ContestsPage from '@/pages/ContestsPage';

// Route guards
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import PublicRoute from '@/components/auth/PublicRoute';

function App() {
  const dispatch = useAppDispatch();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    // Setup socket connection when authenticated
    if (isAuthenticated) {
      // socketService.connect()
    } else {
      socketService.disconnect();
    }

    return () => {
      socketService.disconnect();
    };
  }, [isAuthenticated]);

  useEffect(() => {
    // Monitor online/offline status
    const handleOnline = () => dispatch(setOnlineStatus(true));
    const handleOffline = () => dispatch(setOnlineStatus(false));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [dispatch]);

  return (
    <Routes>
      {/* Public routes */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <AuthLayout>
              <LoginPage />
            </AuthLayout>
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <AuthLayout>
              <RegisterPage />
            </AuthLayout>
          </PublicRoute>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <PublicRoute>
            <AuthLayout>
              <ForgotPasswordPage />
            </AuthLayout>
          </PublicRoute>
        }
      />
      <Route
        path="/reset-password"
        element={
          <PublicRoute>
            <AuthLayout>
              <ResetPasswordPage />
            </AuthLayout>
          </PublicRoute>
        }
      />

      {/* Protected routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <ModernLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/problems" replace />} />
        <Route path="dashboard" element={<ModernDashboardPage />} />
        <Route path="problems" element={<ModernProblemsPage />} />
        <Route path="problems/:id" element={<ModernProblemDetailPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="contests" element={<ContestsPage />} />
      </Route>

      {/* Public home page */}
      <Route path="/home" element={<HomePage />} />

      {/* Catch all route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
