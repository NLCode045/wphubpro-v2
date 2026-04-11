import { AdminStripeSidebar } from '@/components/admin/AdminLayout'
import { DocHelpButton } from '@/components/docs/DocHelpButton'
import PageMetaData from '@/components/PageMetaData'
import { ROUTE_PATHS } from '@/config/routePaths'
import { useDashboardNav } from '@/context/DashboardNavContext'
import { useAuth } from '@/domains/auth'
import type { DocsHelpContextKey } from '@/domains/docs/docsHelpMap'
import { useEffect, useMemo } from 'react'
import { Card, Col, Row } from 'react-bootstrap'
import { Outlet, useLocation, useNavigate } from 'react-router'

function financeHelpContext(pathname: string): DocsHelpContextKey {
  if (pathname.includes('/subscriptions/')) return 'admin:finance:subscription-detail'
  if (pathname.includes('/plans/')) return 'admin:finance:plan-detail'
  if (pathname.includes('/payments/')) return 'admin:finance:payment-detail'
  if (pathname.includes('/billing/invoices/')) return 'admin:finance:payment-detail'
  if (pathname.endsWith('/billing') || pathname.includes('/finance/billing')) return 'admin:finance:payments'
  if (pathname.endsWith('/subscriptions') || pathname.includes('/finance/subscriptions')) {
    return 'admin:finance:subscriptions'
  }
  if (pathname.endsWith('/plans') || pathname.includes('/finance/plans')) return 'admin:finance:plans'
  if (pathname.endsWith('/payments') || pathname.includes('/finance/payments')) return 'admin:finance:payments'
  return 'admin:finance:dashboard'
}

const AdminFinanceLayout = () => {
  const { isAdmin } = useAuth()
  const { setMode } = useDashboardNav()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const helpKey = useMemo(() => financeHelpContext(pathname), [pathname])

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
            <DocHelpButton contextKey={helpKey} />
          </div>
        </Card.Header>
        <Card.Body className="p-0">
          <Row className="g-0">
            <Col lg={3} xl={2} className="border-bottom border-lg-0 border-lg-end bg-light bg-opacity-50 p-3">
              <AdminStripeSidebar />
            </Col>
            <Col lg={9} xl={10} className="p-3 p-lg-4">
              <Outlet />
            </Col>
          </Row>
        </Card.Body>
      </Card>
    </>
  )
}

export default AdminFinanceLayout
