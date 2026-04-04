import PageMetaData from '@/components/PageMetaData';
import { ROUTE_PATHS } from '@/config/routePaths';
import { useDashboardNav } from '@/context/DashboardNavContext';
import { useAuth } from '@/domains/auth';
import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import SupportTicketsListPage from '@/views/support/SupportTicketsListPage';

export default function AdminSupportTicketsPage() {
  const { isAdmin } = useAuth();
  const { setMode } = useDashboardNav();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAdmin) {
      navigate(ROUTE_PATHS.DASHBOARD, { replace: true });
      return;
    }
    setMode('admin');
  }, [isAdmin, navigate, setMode]);

  if (!isAdmin) {
    return null;
  }

  return (
    <>
      <PageMetaData title="Support queue" />
      <SupportTicketsListPage adminMode />
    </>
  );
}
