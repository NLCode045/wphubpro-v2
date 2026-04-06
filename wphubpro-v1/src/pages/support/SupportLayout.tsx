/**
 * Support hub shell: Tickets | Mailbox (Gogo-style top tabs + outlet).
 * Reference layout: gogo-next-mui-admin `pages/support/*` (header + breadcrumbs pattern).
 */
import React, { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Icon from '@mui/material/Icon';
import SoftBox from 'components/SoftBox';
import SoftTypography from 'components/SoftTypography';
import Footer from 'examples/Footer';
import { usePageBreadcrumb } from '../../contexts/PageBreadcrumbContext';
import { ROUTE_PATHS } from '../../config/routePaths';
import { contentPageShellSx, contentPaperPageDescriptionSx, contentPaperPageTitleSx } from '../../theme/contentPaper';

const supportHubTabsSx = {
  minHeight: 40,
  mb: 2,
  borderBottom: 1,
  borderColor: 'divider',
  '& .MuiTab-root': {
    minHeight: 40,
    textTransform: 'none' as const,
    fontWeight: 600,
    fontSize: '0.875rem',
  },
};

const SupportLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { setBreadcrumbConfig } = usePageBreadcrumb();
  const tabIndex = location.pathname.includes('/support/mail') ? 1 : 0;

  useEffect(() => {
    setBreadcrumbConfig({
      pageName: 'Support',
      pageHref: ROUTE_PATHS.SUPPORT,
      tabs: [
        {
          label: 'Tickets',
          icon: 'confirmation_number',
          href: ROUTE_PATHS.SUPPORT_TICKETS,
        },
        {
          label: 'Mailbox',
          icon: 'mail',
          href: ROUTE_PATHS.SUPPORT_MAIL,
        },
      ],
      activeTabIndex: tabIndex,
    });
    return () => setBreadcrumbConfig(null);
  }, [setBreadcrumbConfig, tabIndex]);

  return (
    <>
      <SoftBox sx={contentPageShellSx}>
        <SoftTypography sx={{ ...contentPaperPageTitleSx, mb: 0.5 }}>Support</SoftTypography>
        <SoftTypography sx={{ ...contentPaperPageDescriptionSx, display: 'block', mb: 2.5 }}>
          Create and track helpdesk tickets, or message the team in your mailbox.
        </SoftTypography>

        <Tabs
          value={tabIndex}
          onChange={(_, v) =>
            navigate(v === 0 ? ROUTE_PATHS.SUPPORT_TICKETS : ROUTE_PATHS.SUPPORT_MAIL, { replace: false })
          }
          sx={supportHubTabsSx}
        >
          <Tab icon={<Icon sx={{ fontSize: 20 }}>confirmation_number</Icon>} iconPosition="start" label="Tickets" />
          <Tab icon={<Icon sx={{ fontSize: 20 }}>mail</Icon>} iconPosition="start" label="Mailbox" />
        </Tabs>

        <Outlet />
      </SoftBox>
      <Footer company={{ href: 'https://wphub.pro', name: 'WPHub.PRO' }} links={[]} />
    </>
  );
};

export default SupportLayout;
