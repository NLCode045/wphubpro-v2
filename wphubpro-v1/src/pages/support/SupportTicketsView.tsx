import React from 'react';
import UboldSupportShell from '../../vendor/ubold-support/UboldSupportShell';
import WphubTicketsListView from '../../vendor/ubold-support/wphub/WphubTicketsListView';

const SupportTicketsView: React.FC = () => {
  return (
    <UboldSupportShell>
      <WphubTicketsListView />
    </UboldSupportShell>
  );
};

export default SupportTicketsView;
