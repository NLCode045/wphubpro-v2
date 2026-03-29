import PageMetaData from '@/components/PageMetaData'
import { ROUTE_PATHS } from '@/config/routePaths'
import { useDashboardNav } from '@/context/DashboardNavContext'
import { useAuth } from '@/domains/auth'
import { useEffect } from 'react'
import { Card, Col, Row } from 'react-bootstrap'
import { useNavigate } from 'react-router'

/** Placeholder until the full admin dashboard is implemented. */
const AdminDashboardPage = () => {
  const { isAdmin } = useAuth()
  const { setMode } = useDashboardNav()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isAdmin) {
      navigate(ROUTE_PATHS.DASHBOARD, { replace: true })
      return
    }
    setMode('admin')
  }, [isAdmin, navigate, setMode])

  if (!isAdmin) {
    return null
  }

  return (
    <>
      <PageMetaData title="Admin" />
      <Row>
        <Col>
          <Card>
            <Card.Body>
              <Card.Title as="h4">Admin dashboard</Card.Title>
              <Card.Text className="text-muted mb-0">
                This area is for admin team members. Full tools and navigation will be added here in a follow-up.
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </>
  )
}

export default AdminDashboardPage
