export const ROUTE_PATHS = {
  LOGIN: '/login',
  /** Second step after password or OAuth when Appwrite requires MFA (`user_more_factors_required`). */
  MFA_CHALLENGE: '/verify-mfa',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  DASHBOARD: '/dashboard',
  PROFILE: '/profile',
  SITES: '/sites',
  /** Path pattern: `/sites/:siteId` — use `siteDetailPath(id)` for links. */
  siteDetailPath: (siteId: string) => `/sites/${encodeURIComponent(siteId)}`,
  /** Installed plugin on a site (`plugin` = e.g. `akismet/akismet.php`). */
  sitePluginDetailPath: (siteId: string, plugin: string) =>
    `/sites/${encodeURIComponent(siteId)}/plugins/${encodeURIComponent(plugin)}`,
  /** Installed theme on a site (`stylesheet` = theme directory slug). */
  siteThemeDetailPath: (siteId: string, stylesheet: string) =>
    `/sites/${encodeURIComponent(siteId)}/themes/${encodeURIComponent(stylesheet)}`,
  LIBRARY: '/library',
  /** Logical library item (plugin slug or theme slug). */
  libraryItemDetailPath: (kind: 'plugin' | 'theme', slug: string) =>
    `/library/items/${kind}/${encodeURIComponent(slug)}`,
  /** Admin area default route (full admin UI to be implemented later). */
  ADMIN_DASHBOARD: '/admin',
  ADMIN_USERS: '/admin/users',
  /** Path pattern: `/admin/users/:userId` */
  adminUserPath: (userId: string) => `/admin/users/${encodeURIComponent(userId)}`,
  ADMIN_SETTINGS: '/admin/settings',
  ADMIN_FINANCE: '/admin/finance',
  ADMIN_FINANCE_DASHBOARD: '/admin/finance/dashboard',
  ADMIN_FINANCE_SUBSCRIPTIONS: '/admin/finance/subscriptions',
  ADMIN_FINANCE_PLANS: '/admin/finance/plans',
  ADMIN_FINANCE_PAYMENTS: '/admin/finance/payments',
  adminFinanceSubscriptionPath: (subscriptionId: string) =>
    `/admin/finance/subscriptions/${encodeURIComponent(subscriptionId)}`,
  adminFinancePlanPath: (productId: string) =>
    `/admin/finance/plans/${encodeURIComponent(productId)}`,
  adminFinancePaymentPath: (paymentIntentId: string) =>
    `/admin/finance/payments/${encodeURIComponent(paymentIntentId)}`,
  /** Member support hub */
  SUPPORT: '/support',
  SUPPORT_NEW: '/support/new',
  supportTicketPath: (ticketId: string) => `/support/${encodeURIComponent(ticketId)}`,
  /** Admin: all support tickets */
  ADMIN_SUPPORT: '/admin/support',
  /** User knowledge base (help center) */
  DOCS: '/docs',
  docsArticlePath: (slug: string) => `/docs/a/${encodeURIComponent(slug)}`,
  /** Admin: edit knowledge base articles (mock + localStorage in dev) */
  ADMIN_DOCS: '/admin/docs',
} as const;
