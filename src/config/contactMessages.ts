/**
 * Appwrite team id for the admin team (must match your project’s team `$id`).
 * Override with `APPWRITE_ADMIN_TEAM_ID` if it is not `admin`.
 */
export const ADMIN_TEAM_ID: string =
  (import.meta.env.APPWRITE_ADMIN_TEAM_ID as string | undefined)?.trim() || 'admin';

const CONTACT_PREFIX = 'contact:';

/** Stable thread id for direct messages between a member and the admin team */
export function contactThreadIdForUser(userId: string): string {
  return `${CONTACT_PREFIX}${userId}`;
}

/**
 * New conversation with the team (compose). Distinct from {@link contactThreadIdForUser} so each
 * thread is a separate document; replies use the full key returned from the API / folder list.
 */
export function newContactThreadKeyForUser(userId: string): string {
  const id = String(userId || '').trim();
  if (!id) throw new Error('Missing user id for thread key');
  return `${CONTACT_PREFIX}${id}:${crypto.randomUUID()}`;
}

/** User id of the member in a `contact:*` thread (`contact:userId` or `contact:userId:suffix`) */
export function clientUserIdFromThread(thread: string): string | null {
  if (!thread.startsWith(CONTACT_PREFIX)) return null;
  const rest = thread.slice(CONTACT_PREFIX.length).trim();
  if (!rest.length) return null;
  const parts = rest.split(':');
  const first = parts[0];
  return first && first.length > 0 ? first : null;
}
