import { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAppSelector } from '@/hooks/redux'

interface PublicRouteProps {
  children: ReactNode
}

const PublicRoute = ({ children }: PublicRouteProps) => {
  const { isAuthenticated } = useAppSelector((state) => state.auth)

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

export default PublicRoute