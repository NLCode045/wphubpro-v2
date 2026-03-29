import QueryProvider from '@/components/QueryProvider'
import { LayoutProvider } from '@/context/useLayoutContext'
import { NotificationProvider } from '@/context/useNotificationContext'
import { AuthProvider } from '@/domains/auth'
import type { ChildrenType } from '@/types'

const AppWrapper = ({ children }: ChildrenType) => {
  return (
    <QueryProvider>
      <AuthProvider>
        <LayoutProvider>
          <NotificationProvider>{children}</NotificationProvider>
        </LayoutProvider>
      </AuthProvider>
    </QueryProvider>
  )
}

export default AppWrapper
