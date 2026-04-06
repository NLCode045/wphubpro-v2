import React from 'react';
import Footer from 'examples/Footer';
import SoftBox from 'components/SoftBox';
import UboldSupportShell from '../../vendor/ubold-support/UboldSupportShell';
import WphubAdminMailView from '../../vendor/ubold-support/wphub/WphubAdminMailView';
import { contentPageShellSx } from '../../theme/contentPaper';

const AdminMessagesPage: React.FC = () => {
  return (
    <>
      <SoftBox sx={contentPageShellSx}>
        <UboldSupportShell>
          <WphubAdminMailView />
        </UboldSupportShell>
      </SoftBox>
      <Footer company={{ href: 'https://wphub.pro', name: 'WPHub.PRO' }} links={[]} />
    </>
  );
};

export default AdminMessagesPage;
