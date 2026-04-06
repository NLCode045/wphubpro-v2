import React from 'react';
import Card from '@mui/material/Card';
import SoftButton from 'components/SoftButton';
import SoftBox from 'components/SoftBox';
import Icon from '@mui/material/Icon';
import { Link, useLocation } from 'react-router-dom';
import { ROUTE_PATHS } from '../../config/routePaths';

const accountNavItems = [
  { label: 'Profile', icon: 'person', to: ROUTE_PATHS.ACCOUNT_PROFILE },
  { label: 'Edit', icon: 'edit', to: ROUTE_PATHS.ACCOUNT_EDIT },
  { label: 'Settings', icon: 'settings', to: ROUTE_PATHS.ACCOUNT_SETTINGS },
  { label: 'Subscription', icon: 'credit_card', to: ROUTE_PATHS.ACCOUNT_SUBSCRIPTION },
];

const AccountSectionNav: React.FC = () => { // pragma: allowlist secret
  const location = useLocation();

  return (
    <Card>
      <SoftBox p={2} display="flex" flexWrap="wrap" gap={1}>
        {accountNavItems.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <SoftButton
              key={item.to}
              component={Link}
              to={item.to}
              size="small"
              color="info"
              variant={isActive ? 'contained' : 'outlined'}
            >
              <Icon sx={{ mr: 0.75, fontSize: 16 }}>{item.icon}</Icon>
              {item.label}
            </SoftButton>
          );
        })}
      </SoftBox>
    </Card>
  );
};

export default AccountSectionNav; // pragma: allowlist secret
