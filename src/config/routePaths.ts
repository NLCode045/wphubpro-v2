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
  ADMIN_SETTINGS: '/admin/settings',
} as const;
