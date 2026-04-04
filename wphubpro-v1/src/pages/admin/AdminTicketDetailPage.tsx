import React from 'react';
import { useParams } from 'react-router-dom';
import Footer from 'examples/Footer';
import SoftBox from 'components/SoftBox';
import UboldSupportShell from '../../vendor/ubold-support/UboldSupportShell';
import WphubTicketDetailView from '../../vendor/ubold-support/wphub/WphubTicketDetailView';
import { contentPageShellSx } from '../../theme/contentPaper';

const AdminTicketDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  if (!id) {
    return (
      <SoftBox sx={contentPageShellSx}>
        <p>Missing ticket id.</p>
      </SoftBox>
    );
  }

  return (
    <>
      <SoftBox sx={contentPageShellSx}>
        <UboldSupportShell>
          <WphubTicketDetailView ticketId={id} mode="admin" />
        </UboldSupportShell>
      </SoftBox>
      <Footer company={{ href: 'https://wphub.pro', name: 'WPHub.PRO' }} links={[]} />
    </>
  );
};

export default AdminTicketDetailPage;
