import Loader from '@/components/Loader'
import { ROUTE_PATHS } from '@/config/routePaths'
import { useAuth } from '@/domains/auth'
import type { ReactNode } from 'react'
import { Navigate } from 'react-router'

/** Renders auth pages only when logged out; redirects to dashboard when already authenticated. */
export function AuthScreenGate({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return <Loader height="100vh" />
  }

  if (user) {
    return <Navigate to={ROUTE_PATHS.DASHBOARD} replace />
  }

  return <>{children}</>
}
