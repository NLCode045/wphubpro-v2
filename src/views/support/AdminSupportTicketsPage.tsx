import PageMetaData from '@/components/PageMetaData';
import { ROUTE_PATHS } from '@/config/routePaths';
import { useDashboardNav } from '@/context/DashboardNavContext';
import { useAuth } from '@/domains/auth';
import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import SupportTicketsListPage from '@/views/support/SupportTicketsListPage';

export default function AdminSupportTicketsPage() {
  const { isAdmin } = useAuth();
  const { mode } = useDashboardNav();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAdmin) {
      navigate(ROUTE_PATHS.DASHBOARD, { replace: true });
      return;
    }
    if (mode !== 'admin') {
      navigate(ROUTE_PATHS.DASHBOARD, { replace: true });
    }
  }, [isAdmin, mode, navigate]);

  if (!isAdmin || mode !== 'admin') {
    return null;
  }

  return (
    <>
      <PageMetaData title="Support queue" />
      <SupportTicketsListPage adminMode />
    </>
  );
}
