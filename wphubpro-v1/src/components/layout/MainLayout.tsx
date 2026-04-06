/**
 * Main layout with Soft UI Sidenav and Navbar styling
 */
import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import SoftBox from 'components/SoftBox';

import SidenavJS from 'examples/Sidenav';

const Sidenav = SidenavJS as React.ComponentType<{
  color?: string;
  brand?: string;
  brandName: string;
  userRoutes?: object[];
  adminRoutes?: object[];
  isAdmin?: boolean;
  routes?: object[];
}>;
import { useSoftUIController, setLayout } from 'context';

import WPHubNavbar from './WPHubNavbar';
import { PageBreadcrumbProvider } from '../../contexts/PageBreadcrumbContext';
import { useAuth } from '../../domains/auth';
import { useMenuRoutes } from '../../hooks/useMenuRoutes';
import { usePlatformSettings } from '../../hooks/usePlatformSettings';

const brand = new URL('../../assets/images/logo-ct.png', import.meta.url).href;

const MainLayout: React.FC = () => {
  const [controller, dispatch] = useSoftUIController() as [
    { miniSidenav: boolean },
    React.Dispatch<{ type: string; value: unknown }>,
  ];
  const location = useLocation();
  const isSiteDetailPage = /^\/sites\/[^/]+$/.test(location.pathname);
  const isDashboardPage = location.pathname === '/' || location.pathname === '/dashboard';
  const isLibraryPage = /^\/library(\/|$)/.test(location.pathname);
  const { miniSidenav } = controller;
  const { isAdmin } = useAuth();
  const { userRoutes, adminRoutes } = useMenuRoutes(!!isAdmin);
  const { data: details } = usePlatformSettings('details');
  const brandName = details?.name || 'WPHub.PRO';
  const brandLogo = details?.logoUrl || details?.logoDataUrl || brand;

  useEffect(() => {
    setLayout(dispatch, 'dashboard');
  }, []);

  return (
    <>
      <Sidenav
        color="info"
        brand={brandLogo}
        brandName={brandName}
        userRoutes={userRoutes}
        adminRoutes={adminRoutes}
        isAdmin={isAdmin}
      />
      <PageBreadcrumbProvider>
        <SoftBox
          sx={({ breakpoints, transitions, functions: { pxToRem } }) => ({
            display: 'flex',
            flexDirection: 'column',
            minHeight: '100vh',
            paddingRight: pxToRem(24),
            ...((isSiteDetailPage || isLibraryPage) && {
              height: '100vh',
              maxHeight: '100vh',
              overflow: 'hidden',
            }),
            position: 'relative',
            [breakpoints.up('xl')]: {
              marginLeft: miniSidenav ? pxToRem(120) : pxToRem(274),
              transition: transitions.create(['margin-left', 'margin-right'], {
                easing: transitions.easing.easeInOut,
                duration: transitions.duration.standard,
              }),
            },
          })}
        >
          <WPHubNavbar />
          <SoftBox
            component="main"
            pt={1}
            pb={isDashboardPage ? 1.5 : 3}
            px={3}
            sx={({ breakpoints }) => ({
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
              overflowX: 'hidden',
              overflowY: isSiteDetailPage || isLibraryPage ? 'hidden' : 'auto',
              backgroundColor: isSiteDetailPage ? 'transparent' : undefined,
              [breakpoints.down('sm')]: {
                px: 2,
              },
            })}
          >
            <Outlet />
          </SoftBox>
        </SoftBox>
      </PageBreadcrumbProvider>
    </>
  );
};

export default MainLayout;
