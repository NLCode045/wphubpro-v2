
export namespace Models {
  export type Preferences = Record<string, unknown>;

  export interface User<Prefs = Preferences> {
    $id: string;
    name?: string;
    email?: string;
    prefs?: Prefs;
    [key: string]: unknown;
  }
}

export type User = Models.User<Models.Preferences> & {
  isAdmin?: boolean;
};

export type BillingInterval = 'monthly' | 'yearly';

export type PlanChangeType = 'upgrade' | 'downgrade' | 'same';

export interface StripePlanMetadata {
  key: string;
  value: string;
}

export interface StripePlan {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  monthlyPriceId: string | null;
  yearlyPriceId: string | null;
  currency: string;
  metadata: StripePlanMetadata[];
}

export interface UsageMetrics {
  sitesUsed: number;
  libraryUsed: number;
  storageUsed: number;
}

export interface ActionLogEntry {
  action: string;
  endpoint: string;
  timestamp: number | string;
  request?: unknown;
  response?: unknown;
}

export interface StripeProrationPreview {
  amountDue: number;
  currency: string;
  nextPaymentDate?: number | null;
  lines?: Array<{ description: string; amount: number; period: { start: number; end: number } }>;
}

export interface Subscription {
  stripeSubscriptionId?: string | null;
  stripe_subscription_id?: string | null;
  userId: string;
  planId: string;
  status: 'active' | 'trialing' | 'canceled' | 'past_due';
  sitesLimit: number;
  storageLimit: number; // number of uploads
  libraryLimit: number;
  source?: 'stripe' | 'free-tier'; // Where the subscription data originates
  currentPeriodEnd?: number; // Stripe: Unix timestamp for billing date
  cancelAtPeriodEnd?: boolean; // Stripe: Whether subscription cancels at period end
  priceId?: string; // Stripe: The current price ID
  priceAmount?: number; // Stripe: Unit amount in cents
  currency?: string; // Stripe: Currency code
  interval?: 'month' | 'year'; // Stripe: Billing interval
  intervalCount?: number; // Stripe: Billing interval count
}

export interface Site {
  $id: string;
  userId: string;
  siteUrl: string;
  siteName: string;
  username?: string;
  status: 'connected' | 'disconnected';
  healthStatus: 'healthy' | 'bad';
  lastChecked: string;
  wpVersion: string;
  phpVersion: string;
  actionLog?: ActionLogEntry[];
  metaData?: string;
  enabled?: boolean;
  pluginsMeta?: string;
  themesMeta?: string;
  wpMeta?: string;
  /** JSON string: latest bridge health snapshot from site-health function (`health_meta` column) */
  healthMeta?: string;
  /** JSON string: cached PageSpeed / site performance snapshot (`performance_meta` column) */
  performanceMeta?: string;
  connectionStatus?: ConnectionStatus;
  logData?: {
    incoming: Array<{ type: string; time: string; plugins?: boolean; themes?: boolean }>;
    outgoing: Array<{ time: string; method: string; endpoint: string; statusCode: number; duration?: number; request?: string; response?: string }>;
  };
}

export interface ConnectionStatus {
  status: 'connected' | 'disconnected';
  heartbeatUpdatedAt: string;
}

/** Google PageSpeed Insights scores (0–100), from `site-pagespeed` function */
export interface SitePagespeedScores {
  performance: number | null;
  accessibility: number | null;
  bestPractices: number | null;
  seo: number | null;
}

/** Lab metrics from Lighthouse (PageSpeed) for one strategy. */
export interface SitePagespeedCoreWebVitals {
  /** From `server-response-time` audit (ms), proxy for TTFB. */
  timeToFirstByteMs: number | null;
  largestContentfulPaintMs: number | null;
  cumulativeLayoutShift: number | null;
}

/** Successful payload from `site-pagespeed` for one strategy (desktop or mobile). */
export interface SitePagespeedResult {
  success: boolean;
  strategy: 'desktop' | 'mobile';
  scores?: SitePagespeedScores;
  coreWebVitals?: SitePagespeedCoreWebVitals;
  analyzedUrl?: string;
  lighthouseVersion?: string;
  message?: string;
}

/** Brand image from site HTML via `site-app-icon-preview` (#app-icon-preview, then apple-touch-icon / rel=icon). */
export type SiteAppIconPreviewResult =
  | { success: true; src: string; fetchedUrl?: string; source?: string }
  | { success: false; message?: string };

/** Plugin item in plugins_meta (bridge format) */
export interface PluginMetaItem {
  file: string;
  name: string;
  version: string;
  active: boolean;
  update: string | null;
}

/** Theme item in themes_meta (bridge format) */
export interface ThemeMetaItem {
  stylesheet?: string;
  file?: string;
  name: string;
  version: string;
  active: boolean;
  update: string | null;
}

export type LibraryItemType = 'plugin' | 'theme'

export type LibraryItemSource = 'official' | 'local' | 'remote'

/** Reserved for future UI: single-version vs multiple pinned versions per plugin */
export type LibraryPluginMode = 'single' | 'multi';

/** One pinned version inside a library document’s `versions_json` map. */
export interface LibraryVersionEntry {
  source: LibraryItemSource;
  /** Local: S3 key; remote: HTTPS URL; official pins usually omit. */
  location?: string;
  isDefault?: boolean;
}

export interface LibraryItem {
  $id: string;
  userId: string;
  name: string;
  type: LibraryItemType;
  source: LibraryItemSource;
  version: string;
  author: string;
  description: string;
  s3Path?: string;
  wpSlug?: string;
  /** For Remote source: HTTPS URL to plugin zip file */
  remoteUrl?: string;
  /** Optional labels for filtering and organization (same plugin group usually shares tags). */
  tags?: string[];
  /** Exactly one row per plugin group should be true when multiple versions exist (library default). */
  isDefault?: boolean;
  /** Appwrite document $id when this row is expanded from `versions_json`. */
  libraryDocumentId?: string;
  /** Key in the parent document’s versions map. */
  versionKey?: string;
  /** Optional `library_categories` document id (document-level). */
  categoryId?: string;
  /** Favourite flag on the library document (document-level). */
  isFavourite?: boolean;
}

/** Where a library category appears in the items UI (plugins grid, themes grid, or both). */
export type LibraryCategoryScope = 'general' | 'plugin' | 'theme';

/** User-defined category for organizing library items (`library_categories` collection). */
export interface LibraryCategory {
  $id: string;
  userId: string;
  name: string;
  scope: LibraryCategoryScope;
  /** Legacy: subfolders are no longer used in the UI; kept for old rows. */
  parentId?: string | null;
  color?: string;
  sortOrder?: number;
}

/** Per-source default version (e.g. official: "latest", local: "1.2.3") */
export interface LibraryDefaultVersionPerSource {
  official?: string;
  local?: string;
  remote?: string;
}

/** Per-site override for source and/or version */
export interface LibrarySiteOverride {
  source?: LibraryItemSource;
  version?: string;
}

/** Plugin-level defaults and overrides when a logical plugin has multiple versions */
export interface LibraryPluginSettings {
  wpSlug: string;
  defaultVersion: string;
  defaultSource?: LibraryItemSource;
  defaultVersionPerSource?: LibraryDefaultVersionPerSource;
  siteOverrides?: Record<string, LibrarySiteOverride>;
}

export type LibraryCollectionVersionMode = 'default' | 'manual';

/** One row in a library collection (references a logical library item by slug + type). */
export interface LibraryCollectionMember {
  slug: string;
  type: LibraryItemType;
  versionMode: LibraryCollectionVersionMode;
  /** When versionMode is manual: key matching InstallVersionOption.key from install modals. */
  manualVersionKey?: string;
}

/** Per slug: which library row (source + version) to prefer for installs / display in a family. Keys are lowercase slugs. */
export interface LibraryFamilyMemberPreference {
  /** Matches InstallVersionOption.key (e.g. official-{docId}, local-{docId}, remote-{docId}, theme-{docId}). */
  versionKey: string;
}

/** User-defined group of related library items (e.g. main + pro) by slug. */
export interface LibraryFamily {
  $id: string;
  userId: string;
  name?: string;
  memberSlugs: string[];
  /** Optional: chosen library source/version per member slug (persisted as JSON on the document). */
  memberPreferences?: Record<string, LibraryFamilyMemberPreference>;
}

/** Named bundle of library items for batch install. */
export interface LibraryCollection {
  $id: string;
  userId: string;
  name: string;
  items: LibraryCollectionMember[];
}

/** Resolved install source for library → site plugin install modals. */
export type InstallVersionInfo =
  | { source: 'official'; version: string }
  | { source: 'local'; version: string }
  | { source: 'remote'; version: string; remoteUrl: string };

export interface InstallVersionOption {
  key: string;
  label: string;
  info: InstallVersionInfo;
}

/** Optional family members to install after the primary plugin (same modal). */
export type FamilyInstallBlock =
  | {
      kind: 'plugin';
      blockId: string;
      pluginSlug: string;
      displayName: string;
      versionOptions: InstallVersionOption[];
      defaultInstallInfo: InstallVersionInfo | null;
    }
  | {
      kind: 'theme';
      blockId: string;
      displayName: string;
      /** HTTPS URL to theme zip; wp-proxy fetches and sends as base64 to bridge. */
      zipUrl: string | null;
    };

export interface WordPressPlugin {
  name: string;
  status: 'active' | 'inactive';
  version: string;
  plugin: string; // e.g., 'akismet/akismet.php'
  author?: string;
  description?: string;
  /** New version string when an update is available */
  update?: string | null;
}

export interface WordPressTheme {
  name: string;
  status: 'active' | 'inactive';
  version: string;
  stylesheet: string;
  /** New version string when an update is available */
  update?: string | null;
}

export interface SiteHealth {
    wp_version: string;
    php_version: string;
    // Add other health metrics as needed
}

export interface StripeInvoice {
  id: string;
  created: number;
  amount_paid: number;
  amount_due?: number;
  amount_remaining?: number;
  currency: string;
  status: string;
  invoice_pdf: string;
  hosted_invoice_url?: string;
  number?: string;
  period_start?: number;
  period_end?: number;
}

export interface StripePaymentMethodCard {
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
}

export interface StripePaymentMethod {
  id: string;
  type: string;
  card: StripePaymentMethodCard | null;
}

export interface SubscriptionDetailsPlan {
  product_id: string | null;
  product_name: string | null;
  product_description: string | null;
  price_id: string | null;
  unit_amount: number | null;
  currency: string | null;
  interval: string | null;
  interval_count: number | null;
  metadata: Record<string, string>;
  limits: {
    sites_limit: number | null;
    library_limit: number | null;
    storage_limit: number | null;
  };
}

export interface SubscriptionDetailsPaymentMethod {
  id: string;
  type: string;
  card: StripePaymentMethodCard | null;
}

export interface SubscriptionDetailsPendingUpdate {
  date: number;
  plan_name: string;
  price_amount: number;
  currency: string;
  interval: string;
  schedule_id: string;
}

export interface SubscriptionDetailsUpcomingInvoice {
  amount_due: number;
  currency: string;
  period_start: number;
  period_end: number;
  next_payment_attempt: number | null;
}

export interface SubscriptionDetailsResponse {
  subscription: {
    id: string;
    status: string;
    current_period_start: number;
    current_period_end: number;
    created: number;
    cancel_at: number | null;
    canceled_at: number | null;
    metadata: Record<string, string>;
  };
  customer: {
    id: string;
    email: string | null;
    name: string | null;
  };
  plan: SubscriptionDetailsPlan;
  pending_update: SubscriptionDetailsPendingUpdate | null;
  invoices: Array<{
    id: string;
    number: string | null;
    status: string;
    amount_due: number;
    amount_paid: number;
    amount_remaining: number;
    currency: string;
    created: number;
    due_date: number | null;
    period_start: number;
    period_end: number;
    invoice_pdf: string | null;
    hosted_invoice_url: string | null;
    paid: boolean;
  }>;
  upcoming_invoice: SubscriptionDetailsUpcomingInvoice | null;
  payment_method: SubscriptionDetailsPaymentMethod | null;
}

// --- Notifications ---
export type NotificationType =
  | 'platform'           // Admin-sent announcements
  | 'site_connection'   // Site connection errors
  | 'plugin_update'     // New plugin version available
  | 'theme_update'      // New theme version available
  | 'site_report'       // Weekly performance/statistics per site
  | 'subscription';     // Invoices, renewal, plan changes

export interface Notification {
  $id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  meta?: Record<string, unknown>; // siteId, pluginSlug, invoiceId, etc.
  $createdAt: string;
}

// --- Admin billing (Stripe, Appwrite) ---
export interface AdminAppwriteUserSummary {
  id: string;
  name: string;
  email: string;
}

export interface AdminSubscriptionRow {
  subscriptionId: string;
  status: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: number;
  currentPeriodStart: number;
  customerId: string | null;
  customerEmail: string;
  planLabel: string;
  appwriteUser: AdminAppwriteUserSummary | null;
}

export interface AdminSubscriptionUsage {
  sitesUsed: number;
  libraryUsed: number;
  storageUsed: number;
}

export interface AdminSubscriptionDetailResponse {
  subscription: Record<string, unknown>;
  invoices: Record<string, unknown>[];
  appwriteUser: AdminAppwriteUserSummary | null;
  account: { $id: string; user_id: string } | null;
  usage: AdminSubscriptionUsage;
}

export interface AdminPaymentIntentRow {
  id: string;
  amount: number;
  currency: string;
  status: string;
  description: string | null;
  created: number;
  customerId: string | null;
  customerEmail: string | null;
}

// --- Ticketing / Helpdesk ---
export type TicketStatus = 'open' | 'in_progress' | 'waiting' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Ticket {
  $id: string;
  userId: string;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  category?: string;
  siteId?: string;
  $createdAt: string;
  $updatedAt: string;
}

export interface TicketMessage {
  $id: string;
  ticketId: string;
  userId: string;
  body: string;
  isStaff: boolean;
  $createdAt: string;
}

// --- Messages (view model; backed by `conversations` + `conversation_messages` via function) ---
export type MessageType = 'contact' | 'ticket';

/** Legacy / UI shape: sender & receiver are Appwrite user ids (or `ADMIN_TEAM_ID` for team-facing side). */
export interface Message {
  $id: string;
  sender: string;
  receiver: string;
  thread: string;
  message: string;
  type: MessageType;
  ticket?: string;
  $createdAt: string;
  $updatedAt: string;
  /** Appwrite user name for the message author (non-team); from conversations function. */
  authorName?: string | null;
  authorUserId?: string | null;
  isTeamAuthor?: boolean;
}

export type MailboxFolder = 'inbox' | 'sent' | 'drafts' | 'archive' | 'trash';

/** Appwrite `conversations` document */
export interface Conversation {
  $id: string;
  participant_mailbox_ids: string[];
  created_by_mailbox_id: string;
  subject?: string | null;
  type?: string | null;
  thread_key: string;
  last_message_at?: string | null;
  last_message_preview?: string | null;
  meta?: string | null;
  $createdAt: string;
  $updatedAt: string;
}

/** Appwrite `conversation_messages` document */
export interface ConversationMessage {
  $id: string;
  conversation_id: string;
  author_mailbox_id: string;
  body: string;
  message_type: MessageType | string;
  ticket_id?: string | null;
  $createdAt: string;
  $updatedAt: string;
}

/** Appwrite `conversation_message_placements` document */
export interface ConversationMessagePlacement {
  $id: string;
  conversation_message_id: string;
  conversation_id: string;
  mailbox_id: string;
  mailbox_folder: MailboxFolder | string;
  read_at?: string | null;
  $createdAt: string;
  $updatedAt: string;
}

export interface ConversationThreadRow {
  message: ConversationMessage;
  placements: ConversationMessagePlacement[];
  authorUserId?: string | null;
  authorDisplayName?: string | null;
  isTeamAuthor?: boolean;
}

export interface GetConversationByThreadKeyResponse {
  success: boolean;
  conversation: Conversation | null;
  thread: ConversationThreadRow[];
}

/** Resolved thread from {@link useContactThreadMessages}. */
export interface ContactThreadData {
  messages: Message[];
  conversation: Conversation | null;
}

export interface GetMailboxContextResponse {
  success?: boolean;
  userMailboxId: string;
  teamMailboxId: string;
  /** Admin team name from Appwrite Teams API; UI fallback "Support". */
  teamDisplayName?: string;
}

export interface ListConversationsForMailboxResponse {
  success: boolean;
  conversations: Conversation[];
  total: number;
  peerDisplayNames?: Record<string, string>;
  teamDisplayName?: string;
  conversationLastAuthorLabels?: Record<string, string>;
}

export type MailFolderKind = 'inbox' | 'sent';

/** Row from conversations function `listThreadsForMailboxFolder` */
export interface MailboxFolderThreadRow {
  conversationId: string;
  threadKey: string;
  clientUserId: string | null;
  /** Contact thread member’s Appwrite name when resolved */
  clientDisplayName?: string | null;
  title: string;
  preview: string;
  lastAt: string;
  lastAuthorMailboxId: string;
  /** Pre-resolved label: You, team name, member name, or Member */
  lastAuthorLabel?: string;
  messageType: string;
  ticketId: string | null;
}

// --- Forum ---
export type ForumCategoryKey =
  | 'general'
  | 'platform_features'
  | 'wordpress_dev'
  | 'plugins_themes'
  | 'error_reporting';

export interface ForumCategory {
  $id: string;
  key: ForumCategoryKey;
  name: string;
  description?: string;
  order: number;
}

export interface ForumThread {
  $id: string;
  categoryId: string;
  userId: string;
  title: string;
  postCount: number;
  lastPostAt?: string;
  $createdAt: string;
}

export interface ForumPost {
  $id: string;
  threadId: string;
  userId: string;
  body: string;
  $createdAt: string;
}
