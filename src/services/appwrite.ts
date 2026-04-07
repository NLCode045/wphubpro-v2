import { Client, Account, Databases, Functions, Storage, Teams, Avatars, ID, OAuthProvider } from 'appwrite';

export { OAuthProvider };

const viteEnv = (import.meta as any).env as Record<string, string | undefined>;

/**
 * Reads client env with fallbacks (short `.env` keys first):
 * - First checks Vite-exposed env vars (`import.meta.env`)
 * - Then checks runtime env vars (`process.env` for Node/Appwrite Cloud)
 * - Looks for: `_${suffix}` → `VITE_${suffix}` → `APPWRITE_${suffix}`
 *
 * Examples: `APPWRITE_ENDPOINT` tries `_ENDPOINT`, `VITE_ENDPOINT`, `APPWRITE_ENDPOINT`.
 */
function envString(appwriteKey: string, fallback: string): string {
  const keys: string[] = [];
  if (appwriteKey.startsWith('APPWRITE_')) {
    const suffix = appwriteKey.slice('APPWRITE_'.length);
    keys.push(`_${suffix}`, `VITE_${suffix}`, appwriteKey);
  } else {
    keys.push(appwriteKey);
  }
  
  // Check Vite-exposed env vars (from .env at build time)
  for (const k of keys) {
    const v = viteEnv[k];
    if (typeof v === 'string' && v.trim() !== '') return v.trim();
  }
  
  // Check runtime env vars (process.env for Node.js / Appwrite Cloud)
  if (typeof process !== 'undefined' && process.env) {
    for (const k of keys) {
      const v = process.env[k];
      if (typeof v === 'string' && v.trim() !== '') return v.trim();
    }
  }
  
  return fallback;
}

/**
 * Appwrite config — defaults match `appwrite.config.json` (project, `platform_db` tables, buckets, teams, functions).
 * Override with `.env` keys as documented per constant. Client-safe only; never ship API keys to the browser.
 */
export const APPWRITE_ENDPOINT = envString('APPWRITE_ENDPOINT', 'https://api.wphub.pro/v1');
/** Same as `projectId` in `appwrite.config.json`. */
export const APPWRITE_PROJECT_ID = envString('APPWRITE_PROJECT_ID', '698a55ce00010497b136');
/** Function domain for heartbeat (JWT in header). */
export const APPWRITE_HEARTBEAT_URL = envString('APPWRITE_HEARTBEAT_URL', '');

if (!APPWRITE_PROJECT_ID || APPWRITE_PROJECT_ID.trim() === '') {
  throw new Error(
    'Appwrite project ID ontbreekt. Zet _PROJECT_ID, VITE_PROJECT_ID of APPWRITE_PROJECT_ID in .env en herstart de dev server.',
  );
}

const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID);

/** sessionStorage key — reapplied on load so impersonation survives refresh. */
export const WPHUB_IMPERSONATE_USER_ID_STORAGE_KEY = 'wphub_impersonate_user_id';
/** Who started custom REST impersonation (admin id); used for privileged API calls. */
export const WPHUB_IMPERSONATE_OPERATOR_ID_STORAGE_KEY = 'wphub_impersonate_operator_id';

const HEADER_IMPERSONATE_USER_ID = 'X-Appwrite-Impersonate-User-Id';
const HEADER_IMPERSONATE_USER_EMAIL = 'X-Appwrite-Impersonate-User-Email';
const HEADER_IMPERSONATE_USER_PHONE = 'X-Appwrite-Impersonate-User-Phone';

export function getStoredImpersonationUserId(): string | null {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const v = sessionStorage.getItem(WPHUB_IMPERSONATE_USER_ID_STORAGE_KEY);
    return v && v.trim() ? v.trim() : null;
  } catch {
    return null;
  }
}

function clearImpersonationFromStorage(): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.removeItem(WPHUB_IMPERSONATE_USER_ID_STORAGE_KEY);
    sessionStorage.removeItem(WPHUB_IMPERSONATE_OPERATOR_ID_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function getStoredImpersonationOperatorId(): string | null {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const v = sessionStorage.getItem(WPHUB_IMPERSONATE_OPERATOR_ID_STORAGE_KEY);
    return v && v.trim() ? v.trim() : null;
  } catch {
    return null;
  }
}

export function persistImpersonationOperatorId(userId: string | null): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    if (userId && userId.trim()) {
      sessionStorage.setItem(WPHUB_IMPERSONATE_OPERATOR_ID_STORAGE_KEY, userId.trim());
    } else {
      sessionStorage.removeItem(WPHUB_IMPERSONATE_OPERATOR_ID_STORAGE_KEY);
    }
  } catch {
    /* ignore */
  }
}

/**
 * User id to send for admin-only function payloads when the UI acts as another user:
 * native impersonation → impersonator; custom header impersonation → stored operator; else current user.
 */
export function getPrivilegedActorUserId(user: {
  $id: string;
  impersonatorUserId?: string;
} | null): string | null {
  if (!user) return null;
  if (user.impersonatorUserId?.trim()) return user.impersonatorUserId.trim();
  const target = getStoredImpersonationUserId();
  if (target) {
    const op = getStoredImpersonationOperatorId();
    if (op?.trim()) return op.trim();
  }
  return user.$id;
}

/**
 * Sets or clears REST impersonation headers on the shared Appwrite client.
 * Web SDK 17 has no `setImpersonateUserId()`; headers match Appwrite REST docs.
 */
export function setImpersonationTargetOnClient(userId: string | null): void {
  const h = client.headers as Record<string, string>;
  delete h[HEADER_IMPERSONATE_USER_EMAIL];
  delete h[HEADER_IMPERSONATE_USER_PHONE];
  if (userId && userId.trim()) {
    h[HEADER_IMPERSONATE_USER_ID] = userId.trim();
  } else {
    delete h[HEADER_IMPERSONATE_USER_ID];
  }
}

export function persistImpersonationUserId(userId: string | null): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    if (userId && userId.trim()) {
      sessionStorage.setItem(WPHUB_IMPERSONATE_USER_ID_STORAGE_KEY, userId.trim());
    } else {
      sessionStorage.removeItem(WPHUB_IMPERSONATE_USER_ID_STORAGE_KEY);
    }
  } catch {
    /* ignore */
  }
}

/** Call before `account.get()` on bootstrap so a full reload keeps impersonation. */
export function applyStoredImpersonationHeaders(): void {
  const id = getStoredImpersonationUserId();
  setImpersonationTargetOnClient(id);
}

export function clearImpersonationClientAndStorage(): void {
  setImpersonationTargetOnClient(null);
  clearImpersonationFromStorage();
}

export const account = new Account(client);
export const databases = new Databases(client);
export const functions = new Functions(client);
export const storage = new Storage(client);
export const teams = new Teams(client);
export const avatars = new Avatars(client);

export { client, ID };

/** Database `$id` — `tablesDB` in `appwrite.config.json`. */
export const DATABASE_ID = envString('APPWRITE_DATABASE_ID', 'platform_db');

/** Table `$id`s under `platform_db` — each overridable with `APPWRITE_*_COLLECTION_ID`. */
export const ACCOUNTS_COLLECTION_ID = envString('APPWRITE_ACCOUNTS_COLLECTION_ID', 'accounts');
export const SITES_COLLECTION_ID = envString('APPWRITE_SITES_COLLECTION_ID', 'sites');
export const LIBRARY_COLLECTION_ID = envString('APPWRITE_LIBRARY_COLLECTION_ID', 'library');
export const LIBRARY_CATEGORIES_COLLECTION_ID = envString(
  'APPWRITE_LIBRARY_CATEGORIES_COLLECTION_ID',
  'library_categories',
);
export const LIBRARY_FAMILIES_COLLECTION_ID = envString(
  'APPWRITE_LIBRARY_FAMILIES_COLLECTION_ID',
  'library_families',
);
export const LIBRARY_COLLECTIONS_COLLECTION_ID = envString(
  'APPWRITE_LIBRARY_COLLECTIONS_COLLECTION_ID',
  'library_collections',
);
export const PLATFORM_SETTINGS_COLLECTION_ID = envString(
  'APPWRITE_PLATFORM_SETTINGS_COLLECTION_ID',
  'platform_settings',
);
export const NOTIFICATIONS_COLLECTION_ID = envString('APPWRITE_NOTIFICATIONS_COLLECTION_ID', 'notifications');
export const TICKETS_COLLECTION_ID = envString('APPWRITE_TICKETS_COLLECTION_ID', 'tickets');
export const TICKET_MESSAGES_COLLECTION_ID = envString(
  'APPWRITE_TICKET_MESSAGES_COLLECTION_ID',
  'ticket_messages',
);
export const TICKET_ACTIVITIES_COLLECTION_ID = envString(
  'APPWRITE_TICKET_ACTIVITIES_COLLECTION_ID',
  'ticket_activities',
);
export const MESSAGES_COLLECTION_ID = envString('APPWRITE_MESSAGES_COLLECTION_ID', 'messages');
export const CONVERSATIONS_COLLECTION_ID = envString('APPWRITE_CONVERSATIONS_COLLECTION_ID', 'conversations');
export const CONVERSATION_MESSAGES_COLLECTION_ID = envString(
  'APPWRITE_CONVERSATION_MESSAGES_COLLECTION_ID',
  'conversation_messages',
);
export const CONVERSATION_MESSAGE_PLACEMENTS_COLLECTION_ID = envString(
  'APPWRITE_CONVERSATION_MESSAGE_PLACEMENTS_COLLECTION_ID',
  'conversation_message_placements',
);
export const FORUM_CATEGORIES_COLLECTION_ID = envString(
  'APPWRITE_FORUM_CATEGORIES_COLLECTION_ID',
  'forum_categories',
);
export const FORUM_THREADS_COLLECTION_ID = envString('APPWRITE_FORUM_THREADS_COLLECTION_ID', 'forum_threads');
export const FORUM_POSTS_COLLECTION_ID = envString('APPWRITE_FORUM_POSTS_COLLECTION_ID', 'forum_posts');

/** Storage bucket `$id`s — `buckets` in `appwrite.config.json`. */
export const STORAGE_BUCKET_PLATFORM_ID = envString('APPWRITE_STORAGE_BUCKET_PLATFORM_ID', 'platform');
export const STORAGE_BUCKET_BRIDGE_ID = envString('APPWRITE_STORAGE_BUCKET_BRIDGE_ID', 'bridge');

/** Admin team `$id` — `teams` in `appwrite.config.json`. */
export const ADMIN_TEAM_ID = envString('APPWRITE_ADMIN_TEAM_ID', 'admin');

/**
 * Appwrite Function `$id`s — `functions` in `appwrite.config.json`.
 * Use these (or matching `APPWRITE_FUNCTION_*` env vars) instead of hardcoding strings in hooks.
 */
export const APPWRITE_FUNCTION_IDS = {
  WP_PROXY: envString('APPWRITE_FUNCTION_WP_PROXY', 'wp-proxy'),
  ZIP_PARSER: envString('APPWRITE_FUNCTION_ZIP_PARSER', 'zip-parser'),
  LIBRARY_DELETE_VERSION: envString('APPWRITE_FUNCTION_LIBRARY_DELETE', 'library-delete-version'),
  MANAGE_SETTINGS: envString('APPWRITE_FUNCTION_MANAGE_SETTINGS', 'manage-settings'),
  MANAGE_VAULT_PROVIDERS: envString('APPWRITE_FUNCTION_MANAGE_VAULT_PROVIDERS', 'manage-vault-providers'),
  PUBLIC_AUTH_CONFIG: envString('APPWRITE_FUNCTION_PUBLIC_AUTH_CONFIG', 'public-auth-config'),
  STRIPE_CONFIG: envString('APPWRITE_FUNCTION_STRIPE_CONFIG', 'stripe-config'),
  ADMIN_MANAGE_USERS: envString('APPWRITE_FUNCTION_ADMIN_MANAGE_USERS', 'admin-manage-users'),
  HEALTH_AI_AGENT: envString('APPWRITE_FUNCTION_HEALTH_AI_AGENT', 'health-ai-agent'),
  WPHUB_SITES: envString('APPWRITE_FUNCTION_WPHUB_SITES', 'wphub-sites'),
  FORUM: envString('APPWRITE_FUNCTION_FORUM', 'forum'),
  NOTIFICATIONS: envString('APPWRITE_FUNCTION_NOTIFICATIONS', 'notifications'),
  TICKETS: envString('APPWRITE_FUNCTION_TICKETS', 'tickets'),
  CONVERSATIONS: envString('APPWRITE_FUNCTION_CONVERSATIONS', 'conversations'),
  STRIPE_PORTAL_LINK: envString('APPWRITE_FUNCTION_STRIPE_PORTAL_LINK', 'stripe-portal-link'),
  STRIPE_PRODUCTS: envString('APPWRITE_FUNCTION_STRIPE_PRODUCTS', 'stripe-products'),
  STRIPE_ORDER_PAYMENTS: envString('APPWRITE_FUNCTION_STRIPE_ORDER_PAYMENTS', 'stripe-order-payments'),
  STRIPE_SUBSCRIPTIONS: envString('APPWRITE_FUNCTION_STRIPE_SUBSCRIPTIONS', 'stripe-subscriptions'),
  STRIPE_INVOICES: envString('APPWRITE_FUNCTION_STRIPE_INVOICES', 'stripe-invoices'),
  STRIPE_PAYMENT_METHODS: envString('APPWRITE_FUNCTION_STRIPE_PAYMENT_METHODS', 'stripe-payment-methods'),
  STRIPE_CREATE_CUSTOMER: envString('APPWRITE_FUNCTION_STRIPE_CREATE_CUSTOMER', 'stripe-create-customer'),
  STRIPE_GATEWAY: envString('APPWRITE_FUNCTION_STRIPE_GATEWAY', 'stripe-gateway'),
  S3_GATEWAY: envString('APPWRITE_FUNCTION_S3_GATEWAY', 's3-gateway'),
  OPENAI_GATEWAY: envString('APPWRITE_FUNCTION_OPENAI_GATEWAY', 'openai-gateway'),
  APPWRITE_GATEWAY: envString('APPWRITE_FUNCTION_APPWRITE_GATEWAY', 'appwrite-gateway'),
} as const;

export const COLLECTIONS = {
  SITES: SITES_COLLECTION_ID,
  LIBRARY: LIBRARY_COLLECTION_ID,
  LIBRARY_CATEGORIES: LIBRARY_CATEGORIES_COLLECTION_ID,
  LIBRARY_FAMILIES: LIBRARY_FAMILIES_COLLECTION_ID,
  LIBRARY_COLLECTIONS: LIBRARY_COLLECTIONS_COLLECTION_ID,
  PLATFORM_SETTINGS: PLATFORM_SETTINGS_COLLECTION_ID,
  ACCOUNTS: ACCOUNTS_COLLECTION_ID,
  NOTIFICATIONS: NOTIFICATIONS_COLLECTION_ID,
  TICKETS: TICKETS_COLLECTION_ID,
  TICKET_MESSAGES: TICKET_MESSAGES_COLLECTION_ID,
  TICKET_ACTIVITIES: TICKET_ACTIVITIES_COLLECTION_ID,
  MESSAGES: MESSAGES_COLLECTION_ID,
  CONVERSATIONS: CONVERSATIONS_COLLECTION_ID,
  CONVERSATION_MESSAGES: CONVERSATION_MESSAGES_COLLECTION_ID,
  CONVERSATION_MESSAGE_PLACEMENTS: CONVERSATION_MESSAGE_PLACEMENTS_COLLECTION_ID,
  FORUM_CATEGORIES: FORUM_CATEGORIES_COLLECTION_ID,
  FORUM_THREADS: FORUM_THREADS_COLLECTION_ID,
  FORUM_POSTS: FORUM_POSTS_COLLECTION_ID,
} as const;

export const STORAGE_BUCKETS = {
  PLATFORM: STORAGE_BUCKET_PLATFORM_ID,
  BRIDGE: STORAGE_BUCKET_BRIDGE_ID,
} as const;
