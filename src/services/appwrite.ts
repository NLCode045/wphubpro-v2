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
export const LIBRARY_CATEGORIES_COLLECTION_ID = envString('APPWRITE_LIBRARY_CATEGORIES_COLLECTION_ID', 'library_categories');
export const LIBRARY_FAMILIES_COLLECTION_ID = envString('APPWRITE_LIBRARY_FAMILIES_COLLECTION_ID', 'library_families');
export const LIBRARY_COLLECTIONS_COLLECTION_ID = envString('APPWRITE_LIBRARY_COLLECTIONS_COLLECTION_ID', 'library_collections');
export const NOTIFICATIONS_COLLECTION_ID = envString('APPWRITE_NOTIFICATIONS_COLLECTION_ID', 'notifications');
export const TICKETS_COLLECTION_ID = envString('APPWRITE_TICKETS_COLLECTION_ID', 'tickets');
export const TICKET_MESSAGES_COLLECTION_ID = envString('APPWRITE_TICKET_MESSAGES_COLLECTION_ID', 'ticket_messages');
export const MESSAGES_COLLECTION_ID = envString('APPWRITE_MESSAGES_COLLECTION_ID', 'messages');
export const CONVERSATIONS_COLLECTION_ID = envString('APPWRITE_CONVERSATIONS_COLLECTION_ID', 'conversations');
export const CONVERSATION_MESSAGES_COLLECTION_ID = envString('APPWRITE_CONVERSATION_MESSAGES_COLLECTION_ID', 'conversation_messages');
export const CONVERSATION_MESSAGE_PLACEMENTS_COLLECTION_ID = envString('APPWRITE_CONVERSATION_MESSAGE_PLACEMENTS_COLLECTION_ID', 'conversation_message_placements');
export const FORUM_CATEGORIES_COLLECTION_ID = envString('APPWRITE_FORUM_CATEGORIES_COLLECTION_ID', 'forum_categories');
export const FORUM_THREADS_COLLECTION_ID = envString('APPWRITE_FORUM_THREADS_COLLECTION_ID', 'forum_threads');
export const FORUM_POSTS_COLLECTION_ID = envString('APPWRITE_FORUM_POSTS_COLLECTION_ID', 'forum_posts');

/**
 * Collectie IDs — waar mogelijk uit `.env`; overige vaste schema-namen.
 */
export const COLLECTIONS = {
  SITES: SITES_COLLECTION_ID,
  LIBRARY: LIBRARY_COLLECTION_ID,
  LIBRARY_CATEGORIES: LIBRARY_CATEGORIES_COLLECTION_ID,
  LIBRARY_FAMILIES: LIBRARY_FAMILIES_COLLECTION_ID,
  LIBRARY_COLLECTIONS: LIBRARY_COLLECTIONS_COLLECTION_ID,
  ACCOUNTS: ACCOUNTS_COLLECTION_ID,
  NOTIFICATIONS: NOTIFICATIONS_COLLECTION_ID,
  TICKETS: TICKETS_COLLECTION_ID,
  TICKET_MESSAGES: TICKET_MESSAGES_COLLECTION_ID,
  MESSAGES: MESSAGES_COLLECTION_ID,
  CONVERSATIONS: CONVERSATIONS_COLLECTION_ID,
  CONVERSATION_MESSAGES: CONVERSATION_MESSAGES_COLLECTION_ID,
  CONVERSATION_MESSAGE_PLACEMENTS: CONVERSATION_MESSAGE_PLACEMENTS_COLLECTION_ID,
  FORUM_CATEGORIES: FORUM_CATEGORIES_COLLECTION_ID,
  FORUM_THREADS: FORUM_THREADS_COLLECTION_ID,
  FORUM_POSTS: FORUM_POSTS_COLLECTION_ID,
};
