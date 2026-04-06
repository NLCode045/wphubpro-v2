import { DocHelpButton } from '@/components/docs/DocHelpButton'
import PageMetaData from '@/components/PageMetaData'
import { ROUTE_PATHS } from '@/config/routePaths'
import { useDashboardNav } from '@/context/DashboardNavContext'
import { useAuth } from '@/domains/auth'
import { useEffect } from 'react'
import { Button, Card, Col, Row } from 'react-bootstrap'
import { useNavigate } from 'react-router'

/** Placeholder until the full admin dashboard is implemented. */
const AdminDashboardPage = () => {
  const { isAdmin } = useAuth()
  const { mode } = useDashboardNav()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isAdmin) {
      navigate(ROUTE_PATHS.DASHBOARD, { replace: true })
      return
    }
    if (mode !== 'admin') {
      navigate(ROUTE_PATHS.DASHBOARD, { replace: true })
    }
  }, [isAdmin, mode, navigate])

  if (!isAdmin || mode !== 'admin') {
    return null
  }

  return (
    <>
      <PageMetaData title="Admin" />
      <Row>
        <Col>
          <Card>
            <Card.Body>
              <div className="d-flex flex-wrap align-items-start justify-content-between gap-2 mb-2">
                <Card.Title as="h4" className="mb-0">
                  Admin dashboard
                </Card.Title>
                <DocHelpButton contextKey="admin:dashboard" />
              </div>
              <Card.Text className="text-muted mb-3">
                This area is for admin team members. Use the sidebar to open Users, Platform settings, or Finance.
              </Card.Text>
              <Button variant="primary" size="sm" onClick={() => navigate(ROUTE_PATHS.ADMIN_FINANCE_DASHBOARD)}>
                Open Finance admin
              </Button>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </>
  )
}

export default AdminDashboardPage
