import { AuthScreenGate } from '@/components/AuthScreenGate'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { ROUTE_PATHS } from '@/config/routePaths'
import MainLayout from '@/layouts/MainLayout.tsx'
import AdminDashboardPage from '@/views/admin'
import AdminFinanceLayout from '@/views/admin/finance/AdminFinanceLayout'
import FinancePaymentDetailPage from '@/views/admin/finance/FinancePaymentDetailPage'
import FinancePaymentsPage from '@/views/admin/finance/FinancePaymentsPage'
import BillingOverviewPage from '@/pages/admin/BillingOverview'
import AdminStripeDashboardPage from '@/pages/admin/Dashboard'
import InvoiceDetailPage from '@/pages/admin/InvoiceDetail'
import PlanDetailPage from '@/pages/admin/PlanDetail'
import PlanMgmtPage from '@/pages/admin/PlanMgmt'
import SubscriptionDetailPage from '@/pages/admin/SubscriptionDetail'
import SubscriptionMgmtPage from '@/pages/admin/SubscriptionMgmt'
import AdminDocsManagerPage from '@/views/admin/docs/AdminDocsManagerPage'
import AdminPlatformSettingsPage from '@/views/admin/settings'
import AdminUsersOverviewPage from '@/views/admin/users'
import DocsArticlePage from '@/views/docs/DocsArticlePage'
import DocsHomePage from '@/views/docs/DocsHomePage'
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
import MfaChallengePage from '@/views/auth/auth-1/mfa-challenge'
import LoginPage from '@/views/auth/auth-1/sign-in'
import NewPasswordPage from '@/views/auth/auth-1/new-password'
import RegisterPage from '@/views/auth/auth-1/sign-up'
import { Navigate, type RouteObject } from 'react-router'
import ConnectSuccessPage from '@/views/connect/ConnectSuccessPage'

export const routes: RouteObject[] = [
  { path: '/auth-1/sign-in', element: <Navigate to={ROUTE_PATHS.LOGIN} replace /> },
  { path: '/auth-1/sign-up', element: <Navigate to={ROUTE_PATHS.REGISTER} replace /> },
  { path: '/auth-1/reset-password', element: <Navigate to={ROUTE_PATHS.FORGOT_PASSWORD} replace /> },
  {
    path: ROUTE_PATHS.MFA_CHALLENGE,
    element: <MfaChallengePage />,
  },
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
    path: ROUTE_PATHS.CONNECT_SUCCESS,
    element: <ConnectSuccessPage />,
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
      { path: ROUTE_PATHS.ADMIN_DOCS, element: <AdminDocsManagerPage /> },
      { path: ROUTE_PATHS.DOCS, element: <DocsHomePage /> },
      { path: `${ROUTE_PATHS.DOCS}/a/:slug`, element: <DocsArticlePage /> },
      {
        path: ROUTE_PATHS.ADMIN_FINANCE,
        element: <AdminFinanceLayout />,
        children: [
          { index: true, element: <Navigate to="dashboard" replace /> },
          { path: 'dashboard', element: <AdminStripeDashboardPage /> },
          { path: 'subscriptions', element: <SubscriptionMgmtPage /> },
          { path: 'subscriptions/:subscriptionId', element: <SubscriptionDetailPage /> },
          { path: 'plans', element: <PlanMgmtPage /> },
          { path: 'plans/:productId', element: <PlanDetailPage /> },
          { path: 'billing', element: <BillingOverviewPage /> },
          { path: 'billing/invoices/:invoiceId', element: <InvoiceDetailPage /> },
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
