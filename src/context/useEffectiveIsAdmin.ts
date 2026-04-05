import { useAuth } from '@/domains/auth'
import { useDashboardNav } from '@/context/DashboardNavContext'

/**
 * True only when the account is an admin and the top bar is on Admin.
 * In User mode, the same session behaves like a normal member for UI and client-gated queries.
 */
export function useEffectiveIsAdmin(): boolean {
  const { isAdmin } = useAuth()
  const { mode } = useDashboardNav()
  return Boolean(isAdmin && mode === 'admin')
}
