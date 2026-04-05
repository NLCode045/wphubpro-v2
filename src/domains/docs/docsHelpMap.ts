/**
 * Maps app locations (route + optional tab) to doc article slugs for the help modal.
 * Keys are stable IDs used by `DocHelpButton`.
 */
export const DOCS_HELP_MAP: Record<string, readonly string[]> = {
  'dashboard': ['dashboard-overview', 'welcome-to-wphub-pro'],
  'sites': ['sites-list', 'connecting-the-bridge'],
  'sites:detail:overview': ['site-detail-overview', 'site-detail-plugins', 'site-detail-themes'],
  'sites:detail:plugins': ['site-detail-plugins', 'library-overview'],
  'sites:detail:themes': ['site-detail-themes', 'library-overview'],
  'sites:detail:health': ['site-detail-health', 'connecting-the-bridge'],
  'sites:detail:logs': ['site-detail-logs', 'support-open-ticket'],
  'sites:extension': ['site-extension-detail', 'library-item-detail'],
  'sites:extension:overview': ['site-extension-detail', 'site-detail-overview'],
  'sites:extension:health': ['site-detail-health', 'site-extension-detail'],
  'sites:extension:logs': ['site-detail-logs', 'site-extension-detail'],
  'library': ['library-overview', 'library-families-collections'],
  'library:item': ['library-item-detail', 'library-overview'],
  'support': ['support-tickets-overview', 'support-open-ticket'],
  'support:new': ['support-open-ticket', 'support-tickets-overview'],
  'support:ticket': ['support-ticket-detail', 'support-tickets-overview'],
  'profile:subscription': ['profile-subscription', 'support-open-ticket'],
  'profile:security': ['profile-security', 'welcome-to-wphub-pro'],
  'profile:account': ['profile-account-settings', 'profile-notifications'],
  'profile:notifications': ['profile-notifications', 'profile-account-settings'],
  'admin:dashboard': ['admin-dashboard-intro', 'navigation-and-modes'],
  'admin:users': ['admin-users-overview', 'admin-dashboard-intro'],
  'admin:settings': ['admin-platform-settings', 'admin-finance-overview'],
  'admin:support': ['admin-support-queue', 'support-ticket-detail'],
  'admin:finance:dashboard': ['admin-finance-overview', 'admin-platform-settings'],
  'admin:finance:subscriptions': ['admin-finance-overview', 'profile-subscription'],
  'admin:finance:plans': ['admin-finance-overview', 'profile-subscription'],
  'admin:finance:payments': ['admin-finance-overview', 'support-open-ticket'],
  'admin:finance:subscription-detail': ['admin-finance-overview', 'profile-subscription'],
  'admin:finance:plan-detail': ['admin-finance-overview', 'library-overview'],
  'admin:finance:payment-detail': ['admin-finance-overview', 'support-open-ticket'],
  'admin:docs': ['admin-docs-manager', 'welcome-to-wphub-pro'],
}

export type DocsHelpContextKey = keyof typeof DOCS_HELP_MAP
