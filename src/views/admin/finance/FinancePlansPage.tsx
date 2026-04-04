import { ROUTE_PATHS } from '@/config/routePaths'
import { useAdminStripePlansList } from '@/domains/admin/finance/hooks'
import { Badge, Spinner, Table } from 'react-bootstrap'
import { useNavigate } from 'react-router'

const FinancePlansPage = () => {
  const navigate = useNavigate()
  const { data, isLoading, error } = useAdminStripePlansList()

  if (isLoading) return <Spinner animation="border" />
  if (error) return <p className="text-danger">{error.message}</p>

  const plans = data ?? []

  return (
    <div className="table-responsive">
      <Table hover size="sm" className="align-middle">
        <thead>
          <tr>
            <th>Name</th>
            <th>Status</th>
            <th>Monthly</th>
            <th>Yearly</th>
            <th>Currency</th>
          </tr>
        </thead>
        <tbody>
          {plans.map((p) => (
            <tr
              key={p.id}
              role="button"
              onClick={() => navigate(ROUTE_PATHS.adminFinancePlanPath(p.id))}
            >
              <td>{p.name}</td>
              <td>
                <Badge bg={p.status === 'active' ? 'success' : 'secondary'}>{p.status}</Badge>
              </td>
              <td>{p.monthlyPrice ?? '—'}</td>
              <td>{p.yearlyPrice ?? '—'}</td>
              <td className="text-uppercase">{p.currency}</td>
            </tr>
          ))}
          {plans.length === 0 && (
            <tr>
              <td colSpan={5} className="text-center text-muted py-4">
                No plans returned from Stripe.
              </td>
            </tr>
          )}
        </tbody>
      </Table>
    </div>
  )
}

export default FinancePlansPage
