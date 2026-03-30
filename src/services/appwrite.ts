import { Client, Account, Databases, Functions, Storage, Teams, Avatars, ID, OAuthProvider } from 'appwrite';

export { OAuthProvider };

const viteEnv = (import.meta as any).env as Record<string, string | undefined>;

function envString(key: string, fallback: string): string {
  const v = viteEnv[key];
  return typeof v === 'string' && v.trim() !== '' ? v.trim() : fallback;
}

/**
 * Appwrite config — keys match variables in the project root `.env`.
 * Client-safe only; never put secret API keys in code that ships to the browser.
 */
export const APPWRITE_ENDPOINT = envString('APPWRITE_ENDPOINT', 'https://api.wphub.pro/v1');
export const APPWRITE_PROJECT_ID = envString('APPWRITE_PROJECT_ID', '698a55ce00010497b136');
/** Function domain for heartbeat (JWT in header). */
export const APPWRITE_HEARTBEAT_URL = envString('APPWRITE_HEARTBEAT_URL', '');

if (!APPWRITE_PROJECT_ID || APPWRITE_PROJECT_ID.trim() === '') {
  throw new Error(
    'Appwrite project ID ontbreekt. Zet APPWRITE_PROJECT_ID in .env en herstart de dev server.'
  );
}

const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID);

export const account = new Account(client);
export const databases = new Databases(client);
export const functions = new Functions(client);
export const storage = new Storage(client);
export const teams = new Teams(client);
export const avatars = new Avatars(client);

export { client, ID };

/** Database — `APPWRITE_DATABASE_ID` in `.env` */
export const DATABASE_ID = envString('APPWRITE_DATABASE_ID', 'platform_db');

/** Collections — `APPWRITE_*_COLLECTION_ID` in `.env` */
export const ACCOUNTS_COLLECTION_ID = envString('APPWRITE_ACCOUNTS_COLLECTION_ID', 'accounts');
export const SITES_COLLECTION_ID = envString('APPWRITE_SITES_COLLECTION_ID', 'sites');
export const LIBRARY_COLLECTION_ID = envString('APPWRITE_LIBRARY_COLLECTION_ID', 'library');
export const PLANS_COLLECTION_ID = envString('APPWRITE_PLANS_COLLECTION_ID', 'plans');
export const SUBSCRIPTIONS_COLLECTION_ID = envString(
  'APPWRITE_SUBSCRIPTIONS_COLLECTION_ID',
  'subscriptions'
);

/**
 * Collectie IDs — waar mogelijk uit `.env`; overige vaste schema-namen.
 */
export const COLLECTIONS = {
  SITES: SITES_COLLECTION_ID,
  LIBRARY: LIBRARY_COLLECTION_ID,
  PLANS: PLANS_COLLECTION_ID,
  SUBSCRIPTIONS: SUBSCRIPTIONS_COLLECTION_ID,
  LIBRARY_CATEGORIES: 'library_categories',
  LIBRARY_FAMILIES: 'library_families',
  LIBRARY_COLLECTIONS: 'library_collections',
  SETTINGS: 'platform_settings',
  ACCOUNTS: ACCOUNTS_COLLECTION_ID,
  NOTIFICATIONS: 'notifications',
  TICKETS: 'tickets',
  TICKET_MESSAGES: 'ticket_messages',
  MESSAGES: 'messages',
  CONVERSATIONS: 'conversations',
  CONVERSATION_MESSAGES: 'conversation_messages',
  CONVERSATION_MESSAGE_PLACEMENTS: 'conversation_message_placements',
  FORUM_CATEGORIES: 'forum_categories',
  FORUM_THREADS: 'forum_threads',
  FORUM_POSTS: 'forum_posts',
};
