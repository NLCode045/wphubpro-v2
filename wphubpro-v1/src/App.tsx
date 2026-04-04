import React from 'react';
import { HashRouter, Routes, Route, Navigate, Outlet, useParams } from 'react-router-dom';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

import MainLayout from './components/layout/MainLayout';
import QueryProvider from './QueryProvider';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import { StripeProvider } from './contexts/StripeContext';
import { AuthProvider, useAuth } from './domains/auth';
import { SoftUIControllerProvider } from './context';
import ProtectedRoute from './components/layout/ProtectedRoute';
import AdminRoute from './components/layout/AdminRoute';
import Toaster from './components/ui/Toaster';
import CircularProgress from '@mui/material/CircularProgress';
import { ROUTE_PATHS } from './config/routePaths';

import theme from 'assets/theme';

// Auth pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';

// Pages
import DashboardPage from './pages/DashboardPage';
import SitesPage from './pages/SitesPage';
import SiteDetailPage from './pages/SiteDetailPage';
import ConnectSuccessPage from './pages/ConnectSuccessPage';
import NotFoundPage from './pages/NotFoundPage';
import AccountProfilePage from './pages/account/AccountProfilePage';
import AccountSubscriptionPage from './pages/account/AccountSubscriptionPage';
import SubscriptionPlansPage from './pages/subscription/SubscriptionPlansPage';
import NotificationsPage from './pages/NotificationsPage';
import TicketsPage from './pages/TicketsPage';
import CreateTicketPage from './pages/CreateTicketPage';
import TicketDetailPage from './pages/TicketDetailPage';
import ForumPage from './pages/ForumPage';
import ForumCategoryPage from './pages/ForumCategoryPage';
import ForumThreadPage from './pages/ForumThreadPage';
import ForumNewThreadPage from './pages/ForumNewThreadPage';
import AdminNotificationsPage from './pages/admin/AdminNotificationsPage';
import AdminPlatformSettingsPage from './pages/admin/AdminPlatformSettingsPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminPlansPage from './pages/admin/AdminPlansPage';
import AdminPlanDetailPage from './pages/admin/AdminPlanDetailPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminSubscriptionsPage from './pages/admin/AdminSubscriptionsPage';
import AdminSubscriptionDetailPage from './pages/admin/AdminSubscriptionDetailPage';
import AdminOrdersPage from './pages/admin/AdminOrdersPage';
import AdminTicketsPage from './pages/admin/AdminTicketsPage';
import AdminTicketDetailPage from './pages/admin/AdminTicketDetailPage';
import AdminSupportDashboardPage from './pages/admin/AdminSupportDashboardPage';
import AdminMessagesPage from './pages/admin/AdminMessagesPage';
import SupportLayout from './pages/support/SupportLayout';
import SupportTicketsView from './pages/support/SupportTicketsView';
import SupportMailView from './pages/support/SupportMailView';
import MessagesPage from './pages/MessagesPage';
import LibraryPage from './pages/LibraryPage';
import LibraryFamiliesListPage from './pages/LibraryFamiliesListPage';
import LibraryFamilyDetailPage from './pages/LibraryFamilyDetailPage';
import { ErrorBoundary } from './components/ErrorBoundary';

const PlaceholderPage: React.FC<{ name: string }> = ({ name }) => (
  <div className="p-6 text-lg">Page: {name} — under construction.</div>
);

const RedirectPluginToSitePluginsTab: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={id ? `/sites/${id}?tab=1` : '/sites'} replace />;
};

const AppRoutes: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f8fafc' }}>
        <CircularProgress size={40} />
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path={ROUTE_PATHS.LOGIN}
        element={user ? <Navigate to={ROUTE_PATHS.DASHBOARD} replace /> : <LoginPage />}
      />
      <Route
        path={ROUTE_PATHS.REGISTER}
        element={user ? <Navigate to={ROUTE_PATHS.DASHBOARD} replace /> : <RegisterPage />}
      />
      <Route path={ROUTE_PATHS.CONNECT_SUCCESS} element={<ConnectSuccessPage />} />

      <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to={ROUTE_PATHS.DASHBOARD} replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="sites" element={<SitesPage />} />
        <Route path="sites/:id/plugins/:pluginSlug" element={<RedirectPluginToSitePluginsTab />} />
        <Route path="sites/:id" element={<SiteDetailPage />} />
        <Route path="library/families/:familyId" element={<LibraryFamilyDetailPage />} />
        <Route path="library/families" element={<LibraryFamiliesListPage />} />
        <Route path="library" element={<LibraryPage />} />
        <Route path="account" element={<Navigate to={ROUTE_PATHS.ACCOUNT_PROFILE} replace />} />
        <Route path="account/profile" element={<AccountProfilePage />} />
        <Route path="account/edit" element={<Navigate to={ROUTE_PATHS.ACCOUNT_PROFILE} replace />} />
        <Route path="account/settings" element={<Navigate to={ROUTE_PATHS.ACCOUNT_PROFILE} replace />} />
        <Route path="account/subscription" element={<AccountSubscriptionPage />} />
        <Route path="subscription" element={<Navigate to={ROUTE_PATHS.ACCOUNT_SUBSCRIPTION} replace />} />
        <Route path="subscription/plans" element={<SubscriptionPlansPage />} />

        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="support" element={<SupportLayout />}>
          <Route index element={<Navigate to={ROUTE_PATHS.SUPPORT_TICKETS} replace />} />
          <Route path="tickets" element={<SupportTicketsView />} />
          <Route path="mail" element={<SupportMailView />} />
        </Route>
        <Route path="messages" element={<MessagesPage />} />
        <Route path="tickets" element={<TicketsPage />} />
        <Route path="tickets/new" element={<CreateTicketPage />} />
        <Route path="tickets/:id" element={<TicketDetailPage />} />
        <Route path="forum" element={<ForumPage />} />
        <Route path="forum/category/:key" element={<ForumCategoryPage />} />
        <Route path="forum/thread/:id" element={<ForumThreadPage />} />
        <Route path="forum/new" element={<ForumNewThreadPage />} />

        <Route path="admin" element={<AdminRoute><Outlet /></AdminRoute>}>
          <Route index element={<Navigate to={ROUTE_PATHS.ADMIN_DASHBOARD} replace />} />
          <Route path="dashboard" element={<AdminDashboardPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="users/:userId" element={<PlaceholderPage name="User Detail" />} />
          <Route path="orders" element={<AdminOrdersPage />} />
          <Route path="plans" element={<AdminPlansPage />} />
          <Route path="plans/:planId" element={<AdminPlanDetailPage />} />
          <Route path="subscriptions" element={<AdminSubscriptionsPage />} />
          <Route path="subscriptions/:subscriptionId" element={<AdminSubscriptionDetailPage />} />
          <Route path="settings" element={<ErrorBoundary><AdminPlatformSettingsPage /></ErrorBoundary>} />
          <Route path="notifications" element={<AdminNotificationsPage />} />
          <Route path="support" element={<AdminSupportDashboardPage />} />
          <Route path="messages" element={<AdminMessagesPage />} />
          <Route path="tickets" element={<AdminTicketsPage />} />
          <Route path="tickets/:id" element={<AdminTicketDetailPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <QueryProvider>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        <SoftUIControllerProvider>
          <ThemeProvider>
            <ToastProvider>
              <StripeProvider>
                <HashRouter basename={import.meta.env.BASE_URL === '/' ? '' : import.meta.env.BASE_URL.replace(/\/$/, '')}>
                  <AuthProvider>
                    <AppRoutes />
                    <Toaster />
                  </AuthProvider>
                </HashRouter>
              </StripeProvider>
            </ToastProvider>
          </ThemeProvider>
        </SoftUIControllerProvider>
      </MuiThemeProvider>
    </QueryProvider>
  );
};

export default App;
