import QueryProvider from '@/components/QueryProvider'
import { LayoutProvider } from '@/context/useLayoutContext'
import { NotificationProvider } from '@/context/useNotificationContext'
import { AuthProvider } from '@/domains/auth'
import { DocsProvider } from '@/domains/docs/DocsContext'
import type { ChildrenType } from '@/types'

const AppWrapper = ({ children }: ChildrenType) => {
  return (
    <QueryProvider>
      <AuthProvider>
        <DocsProvider>
          <LayoutProvider>
            <NotificationProvider>{children}</NotificationProvider>
          </LayoutProvider>
        </DocsProvider>
      </AuthProvider>
    </QueryProvider>
  )
}

export default AppWrapper
