/**
 * Server-only — resolve Appwrite user id from `Authorization: Bearer <jwt>` or session secret (`setSession`).
 */
import { Account, Client } from 'node-appwrite';

import { ApiError } from './apiResponse';

export async function getUserIdFromJwt(
  jwt: string | null | undefined,
  endpoint: string,
  projectId: string,
): Promise<string | null> {
  if (!jwt?.trim()) return null;
  const client = new Client().setEndpoint(endpoint).setProject(projectId).setJWT(jwt.trim());
  const account = new Account(client);
  try {
    const u = await account.get();
    return u.$id;
  } catch {
    return null;
  }
}

/**
 * Cookie name for Appwrite SSR / browser sessions — see Appwrite server-side rendering docs.
 */
export function appwriteSessionCookieName(projectId: string): string {
  return `a_session_${projectId.toLowerCase()}`;
}

export function parseCookieHeader(header: string | null | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header?.trim()) return out;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const name = part.slice(0, idx).trim();
    if (!name) continue;
    const raw = part.slice(idx + 1).trim();
    try {
      out[name] = decodeURIComponent(raw);
    } catch {
      out[name] = raw;
    }
  }
  return out;
}

/**
 * Validates a session secret (value of `a_session_<project>`) and returns the user id.
 */
export async function getUserIdFromSessionSecret(
  sessionSecret: string | null | undefined,
  endpoint: string,
  projectId: string,
): Promise<string | null> {
  if (!endpoint?.trim() || !projectId?.trim()) return null;
  if (!sessionSecret?.trim()) return null;
  const client = new Client().setEndpoint(endpoint).setProject(projectId).setSession(sessionSecret.trim());
  const account = new Account(client);
  try {
    const u = await account.get();
    return u.$id;
  } catch {
    return null;
  }
}

export function extractBearerToken(authHeader: string | null | undefined): string | null {
  if (!authHeader || typeof authHeader !== 'string') return null;
  const t = authHeader.trim();
  if (t.toLowerCase().startsWith('bearer ')) return t.slice(7).trim();
  return t || null;
}

export type AuthHeaderSource = {
  authorization?: string | null;
};

export function getAuthorizationHeader(source: AuthHeaderSource): string | null {
  const v = source.authorization;
  if (typeof v !== 'string' || !v.trim()) return null;
  return v;
}

/**
 * Requires a valid Appwrite JWT and returns the authenticated user id.
 */
export async function requireUserIdFromJwt(
  authorizationHeader: string | null | undefined,
  endpoint: string,
  projectId: string,
): Promise<string> {
  const token = extractBearerToken(authorizationHeader);
  if (!token) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Missing Authorization bearer token');
  }
  const userId = await getUserIdFromJwt(token, endpoint, projectId);
  if (!userId) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Invalid or expired JWT');
  }
  return userId;
}

/**
 * JWT first (matches browser `fetch` + `createJWT()`); then Appwrite session cookie (`a_session_<project>`).
 */
export async function requireAuthenticatedUser(params: {
  authorizationHeader: string | null | undefined;
  cookieHeader: string | null | undefined;
  endpoint: string;
  projectId: string;
}): Promise<string> {
  const { authorizationHeader, cookieHeader, endpoint, projectId } = params;
  const fromBearer = extractBearerToken(authorizationHeader);
  if (fromBearer) {
    const uid = await getUserIdFromJwt(fromBearer, endpoint, projectId);
    if (uid) return uid;
    throw new ApiError(401, 'UNAUTHORIZED', 'Invalid or expired JWT');
  }
  const cookieName = appwriteSessionCookieName(projectId);
  const sessionSecret = parseCookieHeader(cookieHeader ?? '')[cookieName];
  const fromSession = await getUserIdFromSessionSecret(sessionSecret, endpoint, projectId);
  if (fromSession) return fromSession;
  throw new ApiError(401, 'UNAUTHORIZED', 'Missing or invalid authentication');
}
