import Loader from '@/components/Loader'
import { useAuth } from '@/domains/auth'
import { useRoutes } from 'react-router'
import { routes } from '@/routes'

function App() {
  const { isLoading } = useAuth()
  const routeElement = useRoutes(routes)

  if (isLoading) {
    return <Loader height="100vh" />
  }

  return routeElement
}

export default App
