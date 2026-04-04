import { AuthScreenGate } from '@/components/AuthScreenGate'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { ROUTE_PATHS } from '@/config/routePaths'
import MainLayout from '@/layouts/MainLayout.tsx'
import AdminDashboardPage from '@/views/admin'
import AdminFinanceLayout from '@/views/admin/finance/AdminFinanceLayout'
import FinanceDashboardPage from '@/views/admin/finance/FinanceDashboardPage'
import FinancePaymentDetailPage from '@/views/admin/finance/FinancePaymentDetailPage'
import FinancePaymentsPage from '@/views/admin/finance/FinancePaymentsPage'
import FinancePlanDetailPage from '@/views/admin/finance/FinancePlanDetailPage'
import FinancePlansPage from '@/views/admin/finance/FinancePlansPage'
import FinanceSubscriptionDetailPage from '@/views/admin/finance/FinanceSubscriptionDetailPage'
import FinanceSubscriptionsPage from '@/views/admin/finance/FinanceSubscriptionsPage'
import AdminPlatformSettingsPage from '@/views/admin/settings'
import AdminUsersOverviewPage from '@/views/admin/users'
import DashboardPage from '@/views/dashboard'
import LibraryPage from '@/views/library'
import LibraryItemDetailPage from '@/views/library/detail/LibraryItemDetailPage'
import SiteDetailPage from '@/views/sites/detail/SiteDetailPage'
import SiteExtensionDetailPage from '@/views/sites/detail/SiteExtensionDetailPage'
import SitesPage from '@/views/sites'
import AdminSupportTicketsPage from '@/views/support/AdminSupportTicketsPage'
import SupportTicketCreatePage from '@/views/support/SupportTicketCreatePage'
import SupportTicketDetailPage from '@/views/support/SupportTicketDetailPage'
import SupportTicketsListPage from '@/views/support/SupportTicketsListPage'
import UserProfilePage from '@/views/profile/UserProfilePage'
import ForgotPasswordPage from '@/views/auth/auth-1/reset-password'
import LoginPage from '@/views/auth/auth-1/sign-in'
import NewPasswordPage from '@/views/auth/auth-1/new-password'
import RegisterPage from '@/views/auth/auth-1/sign-up'
import { Navigate, type RouteObject } from 'react-router'

export const routes: RouteObject[] = [
  { path: '/auth-1/sign-in', element: <Navigate to={ROUTE_PATHS.LOGIN} replace /> },
  { path: '/auth-1/sign-up', element: <Navigate to={ROUTE_PATHS.REGISTER} replace /> },
  { path: '/auth-1/reset-password', element: <Navigate to={ROUTE_PATHS.FORGOT_PASSWORD} replace /> },
  {
    path: ROUTE_PATHS.LOGIN,
    element: (
      <AuthScreenGate>
        <LoginPage />
      </AuthScreenGate>
    ),
  },
  {
    path: ROUTE_PATHS.REGISTER,
    element: (
      <AuthScreenGate>
        <RegisterPage />
      </AuthScreenGate>
    ),
  },
  {
    path: ROUTE_PATHS.FORGOT_PASSWORD,
    element: (
      <AuthScreenGate>
        <ForgotPasswordPage />
      </AuthScreenGate>
    ),
  },
  {
    path: ROUTE_PATHS.RESET_PASSWORD,
    element: (
      <AuthScreenGate>
        <NewPasswordPage />
      </AuthScreenGate>
    ),
  },
  {
    element: (
      <ProtectedRoute>
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: '/', element: <Navigate to={ROUTE_PATHS.DASHBOARD} replace /> },
      { path: ROUTE_PATHS.DASHBOARD, element: <DashboardPage /> },
      { path: ROUTE_PATHS.PROFILE, element: <UserProfilePage /> },
      { path: ROUTE_PATHS.SUPPORT, element: <SupportTicketsListPage /> },
      { path: ROUTE_PATHS.SUPPORT_NEW, element: <SupportTicketCreatePage /> },
      { path: `${ROUTE_PATHS.SUPPORT}/:ticketId`, element: <SupportTicketDetailPage /> },
      { path: ROUTE_PATHS.ADMIN_SUPPORT, element: <AdminSupportTicketsPage /> },
      { path: ROUTE_PATHS.ADMIN_DASHBOARD, element: <AdminDashboardPage /> },
      { path: ROUTE_PATHS.ADMIN_USERS, element: <AdminUsersOverviewPage /> },
      { path: ROUTE_PATHS.ADMIN_SETTINGS, element: <AdminPlatformSettingsPage /> },
      {
        path: ROUTE_PATHS.ADMIN_FINANCE,
        element: <AdminFinanceLayout />,
        children: [
          { index: true, element: <Navigate to="dashboard" replace /> },
          { path: 'dashboard', element: <FinanceDashboardPage /> },
          { path: 'subscriptions', element: <FinanceSubscriptionsPage /> },
          { path: 'subscriptions/:subscriptionId', element: <FinanceSubscriptionDetailPage /> },
          { path: 'plans', element: <FinancePlansPage /> },
          { path: 'plans/:productId', element: <FinancePlanDetailPage /> },
          { path: 'payments', element: <FinancePaymentsPage /> },
          { path: 'payments/:paymentIntentId', element: <FinancePaymentDetailPage /> },
        ],
      },
      { path: ROUTE_PATHS.SITES, element: <SitesPage /> },
      { path: `${ROUTE_PATHS.SITES}/:siteId/plugins/:pluginId`, element: <SiteExtensionDetailPage /> },
      { path: `${ROUTE_PATHS.SITES}/:siteId/themes/:themeId`, element: <SiteExtensionDetailPage /> },
      { path: `${ROUTE_PATHS.SITES}/:siteId`, element: <SiteDetailPage /> },
      { path: `${ROUTE_PATHS.LIBRARY}/items/:itemKind/:itemSlug`, element: <LibraryItemDetailPage /> },
      { path: ROUTE_PATHS.LIBRARY, element: <LibraryPage /> },
    ],
  },
]
