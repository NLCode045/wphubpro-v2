import { DocHelpButton } from '@/components/docs/DocHelpButton'
import PageMetaData from '@/components/PageMetaData'
import { TabNavLabel } from '@/components/TabNavLabel'
import { ROUTE_PATHS } from '@/config/routePaths'
import { useDashboardNav } from '@/context/DashboardNavContext'
import { useAuth } from '@/domains/auth'
import type { DocsHelpContextKey } from '@/domains/docs/docsHelpMap'
import { useEffect, useMemo } from 'react'
import { Card, Nav } from 'react-bootstrap'
import type { IconType } from 'react-icons'
import { TbLayoutDashboard, TbListDetails, TbPackages, TbReceipt, TbWallet } from 'react-icons/tb'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router'

const FINANCE_SECTION_TABS: { to: string; label: string; Icon: IconType; end?: boolean }[] = [
  { to: ROUTE_PATHS.ADMIN_FINANCE_DASHBOARD, label: 'Dashboard', Icon: TbLayoutDashboard, end: true },
  { to: ROUTE_PATHS.ADMIN_FINANCE_SUBSCRIPTIONS, label: 'Subscriptions', Icon: TbListDetails },
  { to: ROUTE_PATHS.ADMIN_FINANCE_PLANS, label: 'Plans', Icon: TbPackages },
  { to: ROUTE_PATHS.ADMIN_FINANCE_BILLING, label: 'Billing', Icon: TbReceipt },
  { to: ROUTE_PATHS.ADMIN_FINANCE_PAYMENTS, label: 'Payments', Icon: TbWallet },
]

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
          <Nav
            as="div"
            variant="underline"
            className="gap-3 flex-wrap flex-md-nowrap mt-3 mb-0"
            role="tablist"
            aria-label="Finance sections"
          >
            {FINANCE_SECTION_TABS.map(({ to, label, Icon, end }) => (
              <Nav.Item key={to}>
                <Nav.Link
                  as={NavLink}
                  to={to}
                  end={end}
                  className="py-2 px-0"
                  role="tab"
                >
                  <TabNavLabel Icon={Icon}>{label}</TabNavLabel>
                </Nav.Link>
              </Nav.Item>
            ))}
          </Nav>
        </Card.Header>
        <Card.Body className="p-3 p-lg-4">
          <Outlet />
        </Card.Body>
      </Card>
    </>
  )
}

export default AdminFinanceLayout
