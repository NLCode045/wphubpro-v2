import Loader from '@/components/Loader'
import { useAuth } from '@/domains/auth'
import { useRoutes } from 'react-router'
import { routes } from '@/routes'

function App() {
  const { isLoading } = useAuth()

  if (isLoading) {
    return <Loader height="100vh" />
  }

  return useRoutes(routes)
}

export default App
