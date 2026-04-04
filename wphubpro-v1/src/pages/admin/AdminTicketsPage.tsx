import React from 'react';
import Footer from 'examples/Footer';
import SoftBox from 'components/SoftBox';
import UboldSupportShell from '../../vendor/ubold-support/UboldSupportShell';
import WphubAdminTicketsListView from '../../vendor/ubold-support/wphub/WphubAdminTicketsListView';
import { contentPageShellSx } from '../../theme/contentPaper';

const AdminTicketsPage: React.FC = () => {
  return (
    <>
      <SoftBox sx={contentPageShellSx}>
        <UboldSupportShell>
          <WphubAdminTicketsListView />
        </UboldSupportShell>
      </SoftBox>
      <Footer company={{ href: 'https://wphub.pro', name: 'WPHub.PRO' }} links={[]} />
    </>
  );
};

export default AdminTicketsPage;
