import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ChildrenType } from '@/types'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      retry: 1,
    },
  },
})

const QueryProvider = ({ children }: ChildrenType) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
)

export default QueryProvider
