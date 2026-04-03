import Loader from '@/components/Loader'
import { ROUTE_PATHS } from '@/config/routePaths'
import { useAuth } from '@/domains/auth'
import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, isLoading, mfaPending } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return <Loader height="100vh" />
  }

  if (!user) {
    if (mfaPending) {
      return <Navigate to={ROUTE_PATHS.MFA_CHALLENGE} state={{ from: location }} replace />
    }
    return <Navigate to={ROUTE_PATHS.LOGIN} state={{ from: location }} replace />
  }

  return <>{children}</>
}
