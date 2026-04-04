import React, { useEffect } from 'react';
import Footer from 'examples/Footer';
import SoftBox from 'components/SoftBox';
import UboldSupportShell from '../../vendor/ubold-support/UboldSupportShell';
import WphubAdminSupportDashboard from '../../vendor/ubold-support/wphub/WphubAdminSupportDashboard';
import { usePageBreadcrumb } from '../../contexts/PageBreadcrumbContext';
import { contentPageShellSx } from '../../theme/contentPaper';

const AdminSupportDashboardPage: React.FC = () => {
  const { setBreadcrumbTitle } = usePageBreadcrumb();

  useEffect(() => {
    setBreadcrumbTitle('Support center');
    return () => setBreadcrumbTitle(null);
  }, [setBreadcrumbTitle]);

  return (
    <>
      <SoftBox sx={contentPageShellSx}>
        <UboldSupportShell>
          <WphubAdminSupportDashboard />
        </UboldSupportShell>
      </SoftBox>
      <Footer company={{ href: 'https://wphub.pro', name: 'WPHub.PRO' }} links={[]} />
    </>
  );
};

export default AdminSupportDashboardPage;
