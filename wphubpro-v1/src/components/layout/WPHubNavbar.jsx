/**
 * WPHub navbar - Soft UI DashboardNavbar styling with Auth integration
 * Shows user info + logout when logged in, Sign in link when not
 */
import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Icon from '@mui/material/Icon';

import SoftBox from 'components/SoftBox';
import SoftInput from 'components/SoftInput';
import WPHubBreadcrumbs from './WPHubBreadcrumbs';

import { useSoftUIController, setTransparentNavbar } from 'context';
import { useAuth } from '../../domains/auth';
import { usePageBreadcrumb } from '../../contexts/PageBreadcrumbContext';
import { useNotifications } from '../../domains/notifications';


import {
  navbar,
  navbarContainer,
} from 'examples/Navbars/DashboardNavbar/styles';

function WPHubNavbar({ absolute = false, light = false, isMini = false }) {
  const [navbarType, setNavbarType] = useState();
  const [controller, dispatch] = useSoftUIController();
  const { transparentNavbar, fixedNavbar } = controller;
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };
  const { simpleTitle, breadcrumbConfig } = usePageBreadcrumb();
  const { data: notificationsData } = useNotifications({ unreadOnly: true, limit: 99 });
  const unreadCount = notificationsData?.total ?? 0;
  const route = location.pathname.split('/').filter(Boolean);
  const canGoBack = route.length > 1;
  const parentPath = '/' + route.slice(0, -1).join('/');

  useEffect(() => {
    setNavbarType(fixedNavbar ? 'sticky' : 'static');

    function handleTransparentNavbar() {
      setTransparentNavbar(dispatch, (fixedNavbar && window.scrollY === 0) || !fixedNavbar);
    }
    window.addEventListener('scroll', handleTransparentNavbar);
    handleTransparentNavbar();
    return () => window.removeEventListener('scroll', handleTransparentNavbar);
  }, [dispatch, fixedNavbar]);

  return (
    <AppBar
      position={absolute ? 'absolute' : navbarType}
      color="inherit"
      sx={(theme) => navbar(theme, { transparentNavbar, absolute, light })}
    >
      <Toolbar sx={(theme) => navbarContainer(theme)}>
        <SoftBox display="flex" alignItems="center" justifyContent="space-between" width="100%">
          <SoftBox display="flex" alignItems="center" gap={0.5}>
            {canGoBack && (
              <Tooltip title="Back">
                <IconButton size="small" onClick={() => navigate(parentPath)} sx={{ color: 'inherit', mr: 0.5 }} aria-label="Back">
                  <Icon>arrow_back</Icon>
                </IconButton>
              </Tooltip>
            )}
            <WPHubBreadcrumbs light={light} simpleTitle={simpleTitle} breadcrumbConfig={breadcrumbConfig} />
          </SoftBox>
          {!isMini && (
            <SoftBox display="flex" alignItems="center" gap={1} color={light ? 'white' : 'inherit'}>
              {user && (
                <Tooltip title="Notifications">
                  <IconButton
                    size="small"
                    onClick={() => navigate('/notifications')}
                    sx={{ color: 'inherit', position: 'relative' }}
                    aria-label="Notifications"
                  >
                    <Icon>notifications</Icon>
                    {unreadCount > 0 && (
                      <span
                        style={{
                          position: 'absolute',
                          top: 4,
                          right: 4,
                          minWidth: 16,
                          height: 16,
                          borderRadius: 8,
                          background: '#FD5C70',
                          color: 'white',
                          fontSize: 10,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </IconButton>
                </Tooltip>
              )}
              <SoftInput
                placeholder="Zoek sites..."
                icon={{ component: 'search', direction: 'left' }}
                size="small"
                sx={{ minWidth: 200 }}
              />
              {user && (
                <Tooltip title="Uitloggen">
                  <IconButton size="small" onClick={handleLogout} sx={{ color: 'inherit' }} aria-label="Uitloggen">
                    <Icon>logout</Icon>
                  </IconButton>
                </Tooltip>
              )}
            </SoftBox>
          )}
        </SoftBox>
      </Toolbar>
    </AppBar>
  );
}

export default WPHubNavbar;
