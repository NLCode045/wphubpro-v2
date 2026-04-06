import { DocHelpButton } from '@/components/docs/DocHelpButton';
import PageBreadcrumb from '@/components/PageBreadcrumb';
import { ROUTE_PATHS } from '@/config/routePaths';
import { useAuth } from '@/domains/auth';
import { useAdminTickets, useTickets } from '@/domains/tickets';
import { Container, Spinner } from 'react-bootstrap';
import { SupportTicketsTable } from '@/views/support/SupportTicketsTable';
import { SupportTicketsWidget } from '@/views/support/SupportTicketsWidget';

type Props = {
  adminMode?: boolean;
};

export default function SupportTicketsListPage({ adminMode = false }: Props) {
  const { user } = useAuth();
  const userQ = useTickets();
  const adminQ = useAdminTickets();
  const q = adminMode ? adminQ : userQ;

  if (!user) {
    return null;
  }

  return (
    <>
      <PageBreadcrumb
        title={adminMode ? 'Support queue' : 'My tickets'}
        subtitle="Support"
        titleEnd={<DocHelpButton contextKey={adminMode ? 'admin:support' : 'support'} />}
      />
      <Container fluid>
        {q.isLoading ? (
          <div className="d-flex justify-content-center py-5">
            <Spinner animation="border" role="status" variant="primary" />
          </div>
        ) : (
          <>
            <SupportTicketsWidget tickets={q.data?.tickets ?? []} />
            <SupportTicketsTable
              tickets={q.data?.tickets ?? []}
              adminMode={adminMode}
              newTicketTo={ROUTE_PATHS.SUPPORT_NEW}
            />
          </>
        )}
      </Container>
    </>
  );
}
