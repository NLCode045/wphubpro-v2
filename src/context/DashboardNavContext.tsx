import { useAuth } from '@/domains/auth'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type DashboardNavMode = 'user' | 'admin'

const STORAGE_KEY = 'wphubpro.dashboardNavMode'

type DashboardNavContextValue = {
  mode: DashboardNavMode
  setMode: (mode: DashboardNavMode) => void
}

const DashboardNavContext = createContext<DashboardNavContextValue | undefined>(undefined)

function readStoredMode(): DashboardNavMode {
  try {
    const v = sessionStorage.getItem(STORAGE_KEY)
    if (v === 'admin' || v === 'user') return v
  } catch {
    /* ignore */
  }
  return 'user'
}

export function DashboardNavProvider({ children }: { children: ReactNode }) {
  const { isAdmin } = useAuth()
  const [mode, setModeState] = useState<DashboardNavMode>(readStoredMode)

  const setMode = useCallback((next: DashboardNavMode) => {
    setModeState(next)
    try {
      sessionStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    if (!isAdmin) {
      setModeState('user')
      try {
        sessionStorage.setItem(STORAGE_KEY, 'user')
      } catch {
        /* ignore */
      }
    }
  }, [isAdmin])

  const value = useMemo(() => ({ mode, setMode }), [mode, setMode])

  return <DashboardNavContext.Provider value={value}>{children}</DashboardNavContext.Provider>
}

export function useDashboardNav() {
  const ctx = useContext(DashboardNavContext)
  if (!ctx) {
    throw new Error('useDashboardNav must be used within DashboardNavProvider')
  }
  return ctx
}
