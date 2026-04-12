/**
 * Server-only — WordPress REST proxy (former `wp-proxy` function). Do not import from React.
 *
 * API host should mount POST `/bridge/wp-proxy` (after Vite strips `/api` → same as browser `/api/bridge/wp-proxy`).
 */
import { ApiError } from '../appwrite/apiResponse';
import { getAdminClients } from '../appwrite/adminClients';
import { getAppwriteServerEnv } from '../appwrite/serverEnv';

import { decryptSiteApiKey } from './decrypt';

const ALLOWED_ENDPOINT = /^wphubpro\/v1\/[a-zA-Z0-9_\-./]+$/;
const MAX_BODY_JSON_BYTES = 2 * 1024 * 1024;

export type WpProxyRequestBody = {
  siteId: string;
  endpoint: string;
  method?: string;
  body?: unknown;
};

function normalizeSiteUrl(raw: string): URL {
  const t = raw.trim();
  if (!t.startsWith('http://') && !t.startsWith('https://')) {
    return new URL(`https://${t}`);
  }
  return new URL(t);
}

function buildWpJsonUrl(siteUrl: string, endpointPath: string): string {
  const base = normalizeSiteUrl(siteUrl);
  const path = `${base.pathname.replace(/\/$/, '')}/wp-json/${endpointPath.replace(/^\//, '')}`;
  base.pathname = path;
  return base.toString();
}

function readString(doc: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = doc[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return '';
}

export async function runWpProxyForUser(
  userId: string,
  payload: WpProxyRequestBody,
): Promise<{ status: number; json: unknown }> {
  const siteId = typeof payload.siteId === 'string' ? payload.siteId.trim() : '';
  const endpoint = typeof payload.endpoint === 'string' ? payload.endpoint.trim() : '';
  const methodRaw = (typeof payload.method === 'string' ? payload.method : 'GET').trim().toUpperCase();
  const allowedMethods = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
  if (!siteId) throw new ApiError(400, 'BAD_REQUEST', 'siteId is required');
  if (!endpoint || !ALLOWED_ENDPOINT.test(endpoint)) {
    throw new ApiError(400, 'BAD_REQUEST', 'endpoint must match wphubpro/v1/...');
  }
  if (!allowedMethods.has(methodRaw)) {
    throw new ApiError(400, 'BAD_REQUEST', 'Unsupported HTTP method');
  }

  const env = getAppwriteServerEnv();
  if (!env.encryptionKey?.trim()) {
    throw new ApiError(500, 'INTERNAL', 'ENCRYPTION_KEY is not configured on the API host');
  }

  const sitesCollectionId = process.env.APPWRITE_SITES_COLLECTION_ID?.trim() || 'sites';
  const { databases } = getAdminClients();
  const doc = (await databases.getDocument(env.databaseId, sitesCollectionId, siteId)) as unknown as Record<
    string,
    unknown
  >;
  const owner = readString(doc, 'user_id', 'userId');
  if (owner !== userId) {
    throw new ApiError(403, 'FORBIDDEN', 'You do not have access to this site');
  }

  const siteUrl = readString(doc, 'site_url', 'siteUrl');
  const encryptedKey = readString(doc, 'api_key', 'apiKey');
  if (!siteUrl || !encryptedKey) {
    throw new ApiError(400, 'BAD_REQUEST', 'Site is missing URL or API credentials');
  }

  let plainKey: string;
  try {
    plainKey = decryptSiteApiKey(encryptedKey, env.encryptionKey);
  } catch {
    throw new ApiError(500, 'INTERNAL', 'Could not decrypt site credentials');
  }

  const targetUrl = buildWpJsonUrl(siteUrl, endpoint);
  const init: RequestInit = {
    method: methodRaw,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${plainKey}`,
    },
    signal: AbortSignal.timeout(175_000),
  };

  if (methodRaw !== 'GET' && methodRaw !== 'DELETE' && payload.body !== undefined) {
    const bodyStr = JSON.stringify(payload.body ?? {});
    if (new TextEncoder().encode(bodyStr).length > MAX_BODY_JSON_BYTES) {
      throw new ApiError(413, 'BAD_REQUEST', 'Request body too large');
    }
    init.headers = {
      ...init.headers,
      'Content-Type': 'application/json; charset=utf-8',
    };
    init.body = bodyStr;
  }

  let res: Response;
  try {
    res = await fetch(targetUrl, init);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new ApiError(502, 'BAD_GATEWAY', `Upstream request failed: ${msg}`);
  }

  const text = await res.text();
  let json: unknown = { message: text || res.statusText };
  if (text) {
    try {
      json = JSON.parse(text) as unknown;
    } catch {
      json = { message: text };
    }
  }

  return { status: res.status, json };
}

/** Alias for `runWpProxyForUser` — used by `handler.ts` (`/api/bridge/wp-proxy`). */
export async function runWpProxy(input: {
  userId: string;
  payload: WpProxyRequestBody;
  log?: unknown;
}): Promise<{ status: number; json: unknown }> {
  return runWpProxyForUser(input.userId, input.payload);
}
