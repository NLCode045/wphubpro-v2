import Loader from '@/components/Loader'
import { ROUTE_PATHS } from '@/config/routePaths'
import { useAuth } from '@/domains/auth'
import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return <Loader height="100vh" />
  }

  if (!user) {
    return <Navigate to={ROUTE_PATHS.LOGIN} state={{ from: location }} replace />
  }

  return <>{children}</>
}
