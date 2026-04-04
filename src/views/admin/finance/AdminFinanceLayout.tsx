import PageMetaData from '@/components/PageMetaData'
import { ROUTE_PATHS } from '@/config/routePaths'
import { useDashboardNav } from '@/context/DashboardNavContext'
import { useAuth } from '@/domains/auth'
import { useEffect } from 'react'
import { Card, Nav } from 'react-bootstrap'
import { NavLink, Outlet, useNavigate } from 'react-router'

const tabClass = ({ isActive }: { isActive: boolean }) =>
  `nav-link ${isActive ? 'active fw-semibold' : ''}`

const AdminFinanceLayout = () => {
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
      <PageMetaData title="Admin · Finance" />
      <Card className="border-0 shadow-sm">
        <Card.Header className="bg-transparent border-bottom py-3">
          <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-md-between gap-2">
            <div>
              <Card.Title as="h4" className="mb-0">
                Finance
              </Card.Title>
              <p className="text-muted small mb-0 mt-1">
                Subscriptions, plans, payments, and revenue overview (Stripe).
              </p>
            </div>
          </div>
          <Nav variant="tabs" className="mt-3 border-0">
            <Nav.Item>
              <NavLink to={ROUTE_PATHS.ADMIN_FINANCE_DASHBOARD} className={tabClass} end>
                Dashboard
              </NavLink>
            </Nav.Item>
            <Nav.Item>
              <NavLink to={ROUTE_PATHS.ADMIN_FINANCE_SUBSCRIPTIONS} className={tabClass}>
                Subscriptions
              </NavLink>
            </Nav.Item>
            <Nav.Item>
              <NavLink to={ROUTE_PATHS.ADMIN_FINANCE_PLANS} className={tabClass}>
                Plans
              </NavLink>
            </Nav.Item>
            <Nav.Item>
              <NavLink to={ROUTE_PATHS.ADMIN_FINANCE_PAYMENTS} className={tabClass}>
                Payments
              </NavLink>
            </Nav.Item>
          </Nav>
        </Card.Header>
        <Card.Body className="pt-4">
          <Outlet />
        </Card.Body>
      </Card>
    </>
  )
}

export default AdminFinanceLayout
