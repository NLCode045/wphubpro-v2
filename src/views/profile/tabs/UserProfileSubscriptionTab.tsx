import { useMyAccountDoc } from '@/domains/profile/useMyAccountDoc';
import { useAuth } from '@/domains/auth';
import { Alert, Spinner, Table } from 'react-bootstrap';

const UserProfileSubscriptionTab = () => {
  const { user } = useAuth();
  const { data: accountDoc, isLoading, isError, error } = useMyAccountDoc(user?.$id);

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center py-4">
        <Spinner animation="border" size="sm" role="status" variant="primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <Alert variant="warning" className="mb-0">
        {error instanceof Error ? error.message : 'Could not load subscription data. You may not have access to the accounts collection.'}
      </Alert>
    );
  }

  const stripeId = accountDoc?.stripe_customer_id?.trim() || '';
  const planId = accountDoc?.current_plan_id?.trim() || '';
  const hasPaid = Boolean(stripeId);

  return (
    <div>
      <p className="text-muted fs-xs text-uppercase fw-semibold mb-2">Billing overview</p>
      <p className="text-muted fs-sm mb-4">
        Plan and Stripe linkage come from your platform account. Detailed invoices and payment methods can be wired to Stripe Customer Portal when
        available.
      </p>

      <Table responsive className="mb-0 align-middle">
        <tbody className="fs-sm">
          <tr>
            <th className="text-muted fw-semibold bg-light" style={{ width: '40%' }}>
              Plan
            </th>
            <td>{planId || (hasPaid ? 'Stripe' : 'Free')}</td>
          </tr>
          <tr>
            <th className="text-muted fw-semibold bg-light">Billing</th>
            <td>{hasPaid ? 'Stripe customer' : 'No active paid subscription'}</td>
          </tr>
          <tr>
            <th className="text-muted fw-semibold bg-light">Stripe customer ID</th>
            <td>
              {stripeId ? (
                <code className="fs-xs">{stripeId}</code>
              ) : (
                <span className="text-muted">—</span>
              )}
            </td>
          </tr>
          <tr>
            <th className="text-muted fw-semibold bg-light">Account document</th>
            <td>
              {accountDoc?.$id ? (
                <code className="fs-xs">{accountDoc.$id}</code>
              ) : (
                <span className="text-muted">No account row found</span>
              )}
            </td>
          </tr>
        </tbody>
      </Table>
    </div>
  );
};

export default UserProfileSubscriptionTab;
