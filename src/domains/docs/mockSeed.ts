import type { DocArticle, DocCategory } from './types'

export const MOCK_DOC_CATEGORIES: DocCategory[] = [
  { id: 'getting-started', label: 'Getting started', description: 'Orientation and core concepts.', sortOrder: 10 },
  { id: 'dashboard', label: 'Dashboard', description: 'Home overview and health scores.', sortOrder: 20 },
  { id: 'sites', label: 'Sites', description: 'Connecting and managing WordPress sites.', sortOrder: 30 },
  { id: 'library', label: 'Library', description: 'Plugins, themes, collections, and installs.', sortOrder: 40 },
  { id: 'support', label: 'Support', description: 'Tickets and contacting the team.', sortOrder: 50 },
  { id: 'account', label: 'Account & billing', description: 'Profile, security, and subscription.', sortOrder: 60 },
  { id: 'admin', label: 'Administration', description: 'Platform tools for admin team members.', sortOrder: 70 },
]

function link(slug: string, label: string): string {
  return `<a href="/docs/a/${slug}" class="text-primary fw-semibold text-decoration-none">${label}</a>`
}

export const MOCK_DOC_ARTICLES: DocArticle[] = [
  {
    slug: 'welcome-to-wphub-pro',
    title: 'Welcome to WPHub Pro',
    categoryId: 'getting-started',
    tags: ['overview', 'introduction'],
    excerpt: 'What WPHub Pro is, how it connects to WordPress, and where to go next.',
    sortOrder: 10,
    updatedAt: '2026-04-01',
    contentHtml: `
      <p>WPHub Pro is your control center for <strong>multiple WordPress sites</strong>: connection status, health signals, updates, and a private <strong>library</strong> of plugins and themes you can deploy to sites.</p>
      <p>This knowledge base uses <strong>internal links</strong>—try ${link('connecting-the-bridge', 'Connecting the bridge')} or ${link('dashboard-overview', 'Dashboard overview')}.</p>
      <h5 class="mt-4">Typical workflow</h5>
      <ol>
        <li>Add a site and install the bridge plugin.</li>
        <li>Review the ${link('dashboard-overview', 'dashboard')} for connection and health.</li>
        <li>Use the ${link('library-overview', 'library')} to store packages and install to sites.</li>
        <li>Open ${link('support-tickets-overview', 'support')} when you need help.</li>
      </ol>
    `,
  },
  {
    slug: 'navigation-and-modes',
    title: 'Navigation and admin mode',
    categoryId: 'getting-started',
    tags: ['sidebar', 'admin', 'ui'],
    excerpt: 'Sidebar links, user vs admin mode, and where documentation lives.',
    sortOrder: 20,
    updatedAt: '2026-04-01',
    contentHtml: `
      <p>The <strong>left sidebar</strong> lists Dashboard, Sites, Library, and Support. At the bottom you will find <strong>Help &amp; docs</strong>, which opens the full knowledge base with search and categories.</p>
      <p>If you are on the <strong>admin team</strong>, you can switch to <strong>Admin</strong> mode in the top bar. That reveals Users, Platform settings, Finance, Support queue, and the ${link('admin-docs-manager', 'Docs manager')}.</p>
      <p>On most screens, the small <strong>book icon</strong> next to the page title opens related articles without leaving your work.</p>
    `,
  },
  {
    slug: 'connecting-the-bridge',
    title: 'Connecting the bridge plugin',
    categoryId: 'getting-started',
    tags: ['bridge', 'wordpress', 'api'],
    excerpt: 'How the Hub talks to WordPress through the bridge and API credentials.',
    sortOrder: 30,
    updatedAt: '2026-04-01',
    contentHtml: `
      <p>Each site connects via the <strong>WPHub Pro Bridge</strong> plugin on WordPress. The Hub stores your site URL and secure credentials so it can call REST endpoints under <code>/wp-json/wphubpro/v1/</code>.</p>
      <p>After adding a site, follow the in-app steps to install or upload the bridge. When the connection shows as <strong>connected</strong>, meta sync, health checks, and remote actions become available—see ${link('site-detail-overview', 'Site detail · Overview')}.</p>
      <p>If connection fails, verify SSL, firewall rules, and that the bridge is active. Use ${link('support-open-ticket', 'opening a ticket')} if you are stuck.</p>
    `,
  },
  {
    slug: 'dashboard-overview',
    title: 'Dashboard overview',
    categoryId: 'dashboard',
    tags: ['health', 'stats', 'updates'],
    excerpt: 'Health scores, connection stats, and the combined sites/library panel.',
    sortOrder: 10,
    updatedAt: '2026-04-01',
    contentHtml: `
      <p>The <strong>Dashboard</strong> summarizes your estate: sites needing updates, healthy sites, connected sites, and an overall health score.</p>
      <p>Below the stat cards you get a <strong>combined view</strong> of sites and library items so you can jump quickly into management workflows.</p>
      <p>For deeper inspection of a single site, open it from ${link('sites-list', 'Sites')} and read ${link('site-detail-overview', 'Site detail')}.</p>
    `,
  },
  {
    slug: 'sites-list',
    title: 'Sites list',
    categoryId: 'sites',
    tags: ['table', 'status', 'filters'],
    excerpt: 'Browsing all sites, connection status, and opening a site detail page.',
    sortOrder: 10,
    updatedAt: '2026-04-01',
    contentHtml: `
      <p>The <strong>Sites</strong> page lists every site you added. Columns typically include name, URL, bridge connection, and health indicators.</p>
      <p>Use the row actions or site name to open ${link('site-detail-overview', 'site detail')}. New sites start as disconnected until the bridge is configured—see ${link('connecting-the-bridge', 'Connecting the bridge')}.</p>
    `,
  },
  {
    slug: 'site-detail-overview',
    title: 'Site detail · Overview',
    categoryId: 'sites',
    tags: ['overview', 'updates', 'pagespeed'],
    excerpt: 'Summary cards, updates needed, and quick links to health and extensions.',
    sortOrder: 20,
    updatedAt: '2026-04-01',
    contentHtml: `
      <p>The <strong>Overview</strong> tab highlights pending plugin and theme updates, core metrics, and shortcuts to other tabs on the same page.</p>
      <p>Performance-related widgets (when shown) reflect recent checks; use them as a signal, not a full audit. For extension lists, switch to ${link('site-detail-plugins', 'Plugins')} or ${link('site-detail-themes', 'Themes')}.</p>
    `,
  },
  {
    slug: 'site-detail-plugins',
    title: 'Site detail · Installed plugins',
    categoryId: 'sites',
    tags: ['plugins', 'updates', 'install'],
    excerpt: 'Viewing installed plugins, versions, and updates from the last sync.',
    sortOrder: 30,
    updatedAt: '2026-04-01',
    contentHtml: `
      <p>The <strong>Plugins</strong> tab lists everything WordPress reported for this site: active/inactive state, version, and available updates when metadata is fresh.</p>
      <p>From here you can drill into a single extension—see ${link('site-extension-detail', 'Plugin or theme detail')}—or install from your ${link('library-overview', 'library')} when flows are enabled.</p>
    `,
  },
  {
    slug: 'site-detail-themes',
    title: 'Site detail · Installed themes',
    categoryId: 'sites',
    tags: ['themes', 'updates'],
    excerpt: 'Installed themes, active theme, and update availability.',
    sortOrder: 40,
    updatedAt: '2026-04-01',
    contentHtml: `
      <p>The <strong>Themes</strong> tab mirrors the plugin view for themes: directory slug, version, and updates.</p>
      <p>Align theme rollout with staging practices on production sites. Your ${link('library-overview', 'library')} may hold zipped themes for controlled installs.</p>
    `,
  },
  {
    slug: 'site-detail-health',
    title: 'Site detail · Health',
    categoryId: 'sites',
    tags: ['health', 'diagnostics', 'heartbeat'],
    excerpt: 'Health status, recent pushes, and refreshing site health data.',
    sortOrder: 50,
    updatedAt: '2026-04-01',
    contentHtml: `
      <p>The <strong>Health</strong> tab aggregates signals from the bridge: PHP/environment hints, plugin conflicts where reported, and heartbeat recency.</p>
      <p>Use <strong>refresh</strong> actions when you have just fixed something on the server and want the Hub to re-read state. Persistent issues may warrant ${link('support-open-ticket', 'support')}.</p>
    `,
  },
  {
    slug: 'site-detail-logs',
    title: 'Site detail · Logs',
    categoryId: 'sites',
    tags: ['logs', 'audit', 'actions'],
    excerpt: 'Action history and log output for troubleshooting.',
    sortOrder: 60,
    updatedAt: '2026-04-01',
    contentHtml: `
      <p>The <strong>Logs</strong> tab helps you trace what the Hub or bridge recently attempted—remote installs, health pushes, and similar operations.</p>
      <p>When sharing with support, note timestamps and error snippets from this view. See also ${link('support-ticket-detail', 'ticket conversations')}.</p>
    `,
  },
  {
    slug: 'site-extension-detail',
    title: 'Plugin or theme detail on a site',
    categoryId: 'sites',
    tags: ['extension', 'version', 'remote'],
    excerpt: 'Per-extension view for an installed plugin or theme on a specific site.',
    sortOrder: 70,
    updatedAt: '2026-04-01',
    contentHtml: `
      <p>This screen focuses on <strong>one</strong> installed extension on <strong>one</strong> site: file path or stylesheet, version, update metadata, and contextual actions.</p>
      <p>Compare with ${link('library-item-detail', 'library item detail')}, which describes your catalog entry (possibly multiple versions), not only what is installed on this host.</p>
    `,
  },
  {
    slug: 'library-overview',
    title: 'Library overview',
    categoryId: 'library',
    tags: ['plugins', 'themes', 'upload'],
    excerpt: 'Views, categories, favourites, families, and collections.',
    sortOrder: 10,
    updatedAt: '2026-04-01',
    contentHtml: `
      <p>The <strong>Library</strong> is your private catalog of plugin and theme packages. Switch views (all, plugins only, themes only, favourites, local uploads, etc.) using the tabs and sidebar.</p>
      <p><strong>Families</strong> group related slugs; <strong>collections</strong> bundle items for batch operations toward sites. See ${link('library-families-collections', 'Families and collections')}.</p>
      <p>To inspect one logical item across versions, open ${link('library-item-detail', 'Library item detail')}.</p>
    `,
  },
  {
    slug: 'library-families-collections',
    title: 'Library · Families and collections',
    categoryId: 'library',
    tags: ['families', 'collections', 'batch'],
    excerpt: 'Why families exist, how collections speed up multi-plugin installs.',
    sortOrder: 20,
    updatedAt: '2026-04-01',
    contentHtml: `
      <p><strong>Families</strong> tie together related package identities (for example the same product across sources) so installs target the right slug.</p>
      <p><strong>Collections</strong> are curated lists you can apply to a site in fewer steps than installing one-by-one from search.</p>
      <p>Both features complement ${link('library-overview', 'basic library browsing')}.</p>
    `,
  },
  {
    slug: 'library-item-detail',
    title: 'Library item detail',
    categoryId: 'library',
    tags: ['versions', 'metadata', 'zip'],
    excerpt: 'Versions list, metadata, and actions for a single library item.',
    sortOrder: 30,
    updatedAt: '2026-04-01',
    contentHtml: `
      <p>Each <strong>library item</strong> can hold multiple versions (uploaded ZIPs, remote URLs, or WordPress.org references depending on setup).</p>
      <p>Use this page to confirm the default version, read descriptions, and manage tags or categories that keep large libraries organized—see ${link('library-overview', 'Library overview')}.</p>
    `,
  },
  {
    slug: 'support-tickets-overview',
    title: 'Support · Your tickets',
    categoryId: 'support',
    tags: ['tickets', 'list', 'status'],
    excerpt: 'Listing tickets, statuses, and opening a conversation.',
    sortOrder: 10,
    updatedAt: '2026-04-01',
    contentHtml: `
      <p>The <strong>Support</strong> area lists every ticket you created. Status and last activity help you prioritize follow-ups.</p>
      <p>To start something new, use ${link('support-open-ticket', 'Open a ticket')}. Staff responses appear on ${link('support-ticket-detail', 'ticket detail')}.</p>
    `,
  },
  {
    slug: 'support-open-ticket',
    title: 'Support · Open a ticket',
    categoryId: 'support',
    tags: ['new', 'form', 'context'],
    excerpt: 'Choosing a category and sending the first message.',
    sortOrder: 20,
    updatedAt: '2026-04-01',
    contentHtml: `
      <p>When opening a ticket, pick the closest <strong>category</strong> and describe steps to reproduce. Links to a specific site or error text from ${link('site-detail-logs', 'logs')} speed up resolution.</p>
      <p>After submit you land on ${link('support-ticket-detail', 'the ticket thread')}.</p>
    `,
  },
  {
    slug: 'support-ticket-detail',
    title: 'Support · Ticket detail',
    categoryId: 'support',
    tags: ['messages', 'thread', 'attachments'],
    excerpt: 'Reading and replying in an existing ticket.',
    sortOrder: 30,
    updatedAt: '2026-04-01',
    contentHtml: `
      <p>The ticket page is a <strong>chronological thread</strong> between you and platform staff. Reply inline; avoid creating duplicate tickets for the same issue.</p>
      <p>Admins may use the ${link('admin-support-queue', 'support queue')} to see every customer&apos;s tickets.</p>
    `,
  },
  {
    slug: 'profile-subscription',
    title: 'Profile · Subscription',
    categoryId: 'account',
    tags: ['stripe', 'billing', 'plan'],
    excerpt: 'Plans, Stripe customer portal, and subscription state.',
    sortOrder: 10,
    updatedAt: '2026-04-01',
    contentHtml: `
      <p>The <strong>Subscription</strong> tab shows your current plan and links to manage payment methods or invoices through Stripe’s customer portal when enabled.</p>
      <p>Billing questions that self-service cannot answer belong in ${link('support-open-ticket', 'support')}.</p>
    `,
  },
  {
    slug: 'profile-security',
    title: 'Profile · Security',
    categoryId: 'account',
    tags: ['password', '2fa', 'sessions'],
    excerpt: 'Password changes and security-related account settings.',
    sortOrder: 20,
    updatedAt: '2026-04-01',
    contentHtml: `
      <p>Use <strong>Security</strong> to rotate passwords and review options your administrator enabled (such as OAuth identities).</p>
      <p>Lost access? Use the public recovery flow from the sign-in screen, then tighten security here again.</p>
    `,
  },
  {
    slug: 'profile-account-settings',
    title: 'Profile · Account settings',
    categoryId: 'account',
    tags: ['name', 'email', 'preferences'],
    excerpt: 'Display name, email, and profile preferences.',
    sortOrder: 30,
    updatedAt: '2026-04-01',
    contentHtml: `
      <p>Update how your name appears across the Hub and keep your <strong>email</strong> current so notifications and support replies reach you.</p>
    `,
  },
  {
    slug: 'profile-notifications',
    title: 'Profile · Notifications',
    categoryId: 'account',
    tags: ['alerts', 'email', 'in-app'],
    excerpt: 'Controlling notification channels where available.',
    sortOrder: 40,
    updatedAt: '2026-04-01',
    contentHtml: `
      <p>Notification preferences reduce noise while keeping critical alerts. Options depend on platform configuration.</p>
    `,
  },
  {
    slug: 'admin-dashboard-intro',
    title: 'Admin · Dashboard',
    categoryId: 'admin',
    tags: ['admin', 'entry'],
    excerpt: 'Entry point for admin mode and shortcuts to finance.',
    sortOrder: 10,
    updatedAt: '2026-04-01',
    contentHtml: `
      <p>The <strong>Admin dashboard</strong> is a lightweight landing screen. Use the sidebar for Users, Platform settings, Finance, Support queue, and ${link('admin-docs-manager', 'Docs manager')}.</p>
      <p>Remember: admin features require both an admin account <em>and</em> Admin mode selected in the top bar.</p>
    `,
  },
  {
    slug: 'admin-users-overview',
    title: 'Admin · Users',
    categoryId: 'admin',
    tags: ['members', 'impersonation', 'search'],
    excerpt: 'Searching members, viewing cards, and support workflows.',
    sortOrder: 20,
    updatedAt: '2026-04-01',
    contentHtml: `
      <p><strong>Users</strong> lists platform members. From here admins inspect subscription context, open support-related views, or use controlled impersonation when your policy allows it.</p>
      <p>Always follow your organization’s policy for accessing customer data.</p>
    `,
  },
  {
    slug: 'admin-platform-settings',
    title: 'Admin · Platform settings',
    categoryId: 'admin',
    tags: ['stripe', 'config', 'keys'],
    excerpt: 'Global configuration keys and Stripe-linked options.',
    sortOrder: 30,
    updatedAt: '2026-04-01',
    contentHtml: `
      <p><strong>Platform settings</strong> centralize tunable values that affect checkout, feature flags, or integrations. Changes can impact all users—coordinate with stakeholders.</p>
      <p>Finance reporting still lives under ${link('admin-finance-overview', 'Finance')}.</p>
    `,
  },
  {
    slug: 'admin-support-queue',
    title: 'Admin · Support queue',
    categoryId: 'admin',
    tags: ['tickets', 'staff', 'queue'],
    excerpt: 'Working the global ticket list as staff.',
    sortOrder: 40,
    updatedAt: '2026-04-01',
    contentHtml: `
      <p>The <strong>Support queue</strong> shows tickets across customers. Use filters and assignment flows your team agrees on.</p>
      <p>Members still use ${link('support-tickets-overview', 'their own support list')} for private threads.</p>
    `,
  },
  {
    slug: 'admin-finance-overview',
    title: 'Admin · Finance overview',
    categoryId: 'admin',
    tags: ['stripe', 'mrr', 'revenue'],
    excerpt: 'Finance dashboard tabs: subscriptions, plans, payments.',
    sortOrder: 50,
    updatedAt: '2026-04-01',
    contentHtml: `
      <p><strong>Finance</strong> connects to Stripe for subscriptions, catalog plans, and payment intents. Use the subtabs for dashboard metrics vs operational lists.</p>
      <p>Drill into a row to open detail pages for one subscription, product, or payment. Pair with ${link('admin-platform-settings', 'platform settings')} when prices change.</p>
    `,
  },
  {
    slug: 'admin-docs-manager',
    title: 'Admin · Docs manager',
    categoryId: 'admin',
    tags: ['documentation', 'cms', 'articles'],
    excerpt: 'Editing knowledge base articles, categories, and tags.',
    sortOrder: 60,
    updatedAt: '2026-04-01',
    contentHtml: `
      <p>The <strong>Docs manager</strong> lists every article grouped by category. Admins can change titles, HTML body, category assignment, and comma-separated tags.</p>
      <p>Updates persist in the browser for testing (local storage overlay on mock seed data). In production you would wire this to Appwrite or another API.</p>
      <p>End users browse articles under ${link('welcome-to-wphub-pro', 'Help &amp; docs')} with search and internal links.</p>
    `,
  },
]
