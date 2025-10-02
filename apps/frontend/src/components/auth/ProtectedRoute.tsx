import { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAppSelector } from '@/hooks/redux'

interface ProtectedRouteProps {
  children: ReactNode
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated, token } = useAppSelector((state) => state.auth)
  const location = useLocation()

  if (!isAuthenticated && !token) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}

export default ProtectedRoute