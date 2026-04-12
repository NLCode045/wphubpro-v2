/**
 * Browser calls to `/api/appwrite` and `/api/bridge` (same-origin or proxied in dev).
 * Server implementations live under `src/api/appwrite` and `src/api/bridge`.
 */
import { account } from '@/services/appwrite';

/** Proxied REST base (`vite` → API host). */
export const APPWRITE_API_BASE = '/api/appwrite' as const;
export const BRIDGE_API_BASE = '/api/bridge' as const;

async function jwtAuthHeader(): Promise<Record<string, string>> {
  const jwtRes = await account.createJWT();
  const jwt = typeof jwtRes === 'string' ? jwtRes : (jwtRes as { jwt?: string }).jwt ?? '';
  if (!jwt) return {};
  return { Authorization: `Bearer ${jwt}` };
}

function isProbablyHtml(body: string): boolean {
  const s = body.trimStart();
  return s.startsWith('<!') || s.startsWith('<html') || s.startsWith('<HTML');
}

function shortNonJsonError(status: number, body: string, label: string): Error {
  if (isProbablyHtml(body)) {
    return new Error(
      `API returned HTML (${status}) for ${label}. Configure the API host to serve JSON at this path.`,
    );
  }
  const snippet = body.length > 400 ? `${body.slice(0, 400)}…` : body;
  return new Error(snippet || `Request failed (${status})`);
}

export type PlatformApiFetchOptions = RequestInit & {
  /** Skip JWT (guest / public routes). */
  guest?: boolean;
  /** Abort after this many ms (default 60s; use higher for bridge long calls). */
  timeoutMs?: number;
};

async function platformFetch(
  base: typeof APPWRITE_API_BASE | typeof BRIDGE_API_BASE,
  path: string,
  init: PlatformApiFetchOptions,
): Promise<Response> {
  const { guest, timeoutMs = 60_000, ...rest } = init;
  const url = path.startsWith('http') ? path : `${base}${path.startsWith('/') ? path : `/${path}`}`;
  const auth = guest ? {} : await jwtAuthHeader();
  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, {
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        ...auth,
        ...rest.headers,
      },
      signal: ctrl.signal,
      ...rest,
    });
  } finally {
    clearTimeout(tid);
  }
}

export async function fetchAppwriteApiJson<T>(path: string, init: PlatformApiFetchOptions = {}): Promise<T> {
  const res = await platformFetch(APPWRITE_API_BASE, path, { ...init, method: init.method ?? 'GET' });
  const text = await res.text();
  if (!res.ok) {
    throw shortNonJsonError(res.status, text, 'appwrite');
  }
  if (!text) return {} as T;
  if (isProbablyHtml(text)) {
    throw shortNonJsonError(res.status, text, 'appwrite');
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Invalid JSON from /api/appwrite. First bytes: ${text.slice(0, 120)}`);
  }
}

export async function postAppwriteApiJson<T>(path: string, body: unknown, init: PlatformApiFetchOptions = {}): Promise<T> {
  return fetchAppwriteApiJson<T>(path, {
    ...init,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...init.headers },
    body: JSON.stringify(body),
  });
}

export async function fetchBridgeApiJson<T>(path: string, init: PlatformApiFetchOptions = {}): Promise<T> {
  const res = await platformFetch(BRIDGE_API_BASE, path, { ...init, method: init.method ?? 'GET' });
  const text = await res.text();
  if (!res.ok) {
    throw shortNonJsonError(res.status, text, 'bridge');
  }
  if (!text) return {} as T;
  if (isProbablyHtml(text)) {
    throw shortNonJsonError(res.status, text, 'bridge');
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Invalid JSON from /api/bridge. First bytes: ${text.slice(0, 120)}`);
  }
}

export async function postBridgeApiJson<T>(path: string, body: unknown, init: PlatformApiFetchOptions = {}): Promise<T> {
  return fetchBridgeApiJson<T>(path, {
    ...init,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...init.headers },
    body: JSON.stringify(body),
  });
}

export type PlatformApiWithMeta<T> = {
  data: T;
  statusCode: number;
};

/**
 * Same shape as `executeFunctionWithMeta` for migrations (bridge long calls).
 */
export async function postBridgeApiJsonWithMeta<T>(
  path: string,
  body: unknown,
  options: { timeoutMs?: number; throwOnHttpError?: boolean } = {},
): Promise<PlatformApiWithMeta<T>> {
  const { timeoutMs = 180_000, throwOnHttpError = false } = options;
  const res = await platformFetch(BRIDGE_API_BASE, path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    timeoutMs,
  });
  const text = await res.text();
  let data: T = {} as T;
  if (text && !isProbablyHtml(text)) {
    try {
      data = JSON.parse(text) as T;
    } catch {
      data = text as unknown as T;
    }
  }
  if (throwOnHttpError && (res.status < 200 || res.status >= 300)) {
    const msg =
      data && typeof data === 'object' && data !== null && 'message' in data
        ? String((data as { message?: unknown }).message)
        : `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return { data, statusCode: res.status };
}

export async function postAppwriteApiJsonWithMeta<T>(
  path: string,
  body: unknown,
  options: { timeoutMs?: number } = {},
): Promise<PlatformApiWithMeta<T>> {
  const { timeoutMs = 240_000 } = options;
  const res = await platformFetch(APPWRITE_API_BASE, path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    timeoutMs,
  });
  const text = await res.text();
  let data: T = {} as T;
  if (text && !isProbablyHtml(text)) {
    try {
      data = JSON.parse(text) as T;
    } catch {
      data = text as unknown as T;
    }
  }
  return { data, statusCode: res.status };
}
