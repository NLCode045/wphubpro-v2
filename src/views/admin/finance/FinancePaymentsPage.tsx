import { ROUTE_PATHS } from '@/config/routePaths'
import { useAdminPaymentsList } from '@/domains/admin/finance/hooks'
import type { AdminPaymentIntentRow } from '@/domains/admin/finance/types'
import { useMemo, useState } from 'react'
import { Form, Spinner, Table } from 'react-bootstrap'
import { useNavigate } from 'react-router'

type SortKey = 'date' | 'amount' | 'status' | 'customer'

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100)
}

const FinancePaymentsPage = () => {
  const navigate = useNavigate()
  const [status, setStatus] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const { data, isLoading, error } = useAdminPaymentsList({
    limit: 100,
    status: status || undefined,
  })

  const orders = useMemo(() => {
    const list = [...(data?.orders ?? [])]
    list.sort((a, b) => {
      let va: string | number = 0
      let vb: string | number = 0
      switch (sortKey) {
        case 'amount':
          va = a.amount
          vb = b.amount
          break
        case 'status':
          va = a.status
          vb = b.status
          break
        case 'customer':
          va = a.customer || ''
          vb = b.customer || ''
          break
        case 'date':
        default:
          va = a.date
          vb = b.date
      }
      let c = 0
      if (typeof va === 'number' && typeof vb === 'number') c = va - vb
      else c = String(va).localeCompare(String(vb))
      return sortDir === 'asc' ? c : -c
    })
    return list
  }, [data?.orders, sortDir, sortKey])

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(k)
      setSortDir(k === 'date' || k === 'amount' ? 'desc' : 'asc')
    }
  }

  const Th = ({ k, label }: { k: SortKey; label: string }) => (
    <th role="button" className="user-select-none" onClick={() => toggleSort(k)}>
      {label}
      {sortKey === k ? (sortDir === 'asc' ? ' \u2191' : ' \u2193') : ''}
    </th>
  )

  const open = (r: AdminPaymentIntentRow) => {
    navigate(ROUTE_PATHS.adminFinancePaymentPath(r.id))
  }

  if (isLoading) return <Spinner animation="border" />
  if (error) return <p className="text-danger">{error.message}</p>

  return (
    <div>
      <div className="mb-3" style={{ maxWidth: 280 }}>
        <Form.Label className="small text-muted">Status</Form.Label>
        <Form.Select size="sm" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Any</option>
          <option value="succeeded">Succeeded</option>
          <option value="processing">Processing</option>
          <option value="requires_payment_method">Requires payment method</option>
          <option value="requires_action">Requires action</option>
          <option value="canceled">Canceled</option>
        </Form.Select>
      </div>

      <div className="table-responsive">
        <Table hover size="sm" className="align-middle">
          <thead>
            <tr>
              <Th k="date" label="Date" />
              <Th k="amount" label="Amount" />
              <Th k="status" label="Status" />
              <Th k="customer" label="Customer" />
              <th>Email</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((r) => (
              <tr key={r.id} role="button" onClick={() => open(r)}>
                <td className="small">{new Date(r.date * 1000).toLocaleString()}</td>
                <td className="small">{formatMoney(r.amount, r.currency)}</td>
                <td className="small">{r.status}</td>
                <td className="small font-monospace text-truncate" style={{ maxWidth: 140 }}>
                  {r.customer ?? '—'}
                </td>
                <td className="small">{r.email ?? '—'}</td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center text-muted py-4">
                  No payment intents found.
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>
    </div>
  )
}

export default FinancePaymentsPage
