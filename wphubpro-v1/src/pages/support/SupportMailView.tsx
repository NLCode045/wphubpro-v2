import React from 'react';
import UboldSupportShell from '../../vendor/ubold-support/UboldSupportShell';
import WphubSupportMailView from '../../vendor/ubold-support/wphub/WphubSupportMailView';

const SupportMailView: React.FC = () => {
  return (
    <UboldSupportShell>
      <WphubSupportMailView />
    </UboldSupportShell>
  );
};

export default SupportMailView;
