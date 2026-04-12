/**
 * Server-only — resolve Appwrite user from `Authorization: Bearer` (JWT) or session cookie (`a_session_<project>`).
 */
import { PlatformApiHttpError } from './errors';
import type { AppwriteServerEnv } from './serverEnv';
import { getAppwriteServerEnv } from './serverEnv';
import {
  appwriteSessionCookieName,
  extractBearerToken,
  getUserIdFromJwt,
  getUserIdFromSessionSecret,
  parseCookieHeader,
} from './userSession';

export type IncomingHeaderSource =
  | Headers
  | { get(name: string): string | null | undefined }
  | Record<string, string | string[] | undefined>;

export type VerifiedAppwriteUser = {
  userId: string;
  via: 'jwt' | 'session';
};

export type VerifyAppwriteUserFailure = {
  ok: false;
  reason: 'missing' | 'invalid';
};

export type VerifyAppwriteUserResult = { ok: true } & VerifiedAppwriteUser | VerifyAppwriteUserFailure;

function normalizeHeaderSource(src: IncomingHeaderSource): { get(name: string): string | null } {
  if (typeof Headers !== 'undefined' && src instanceof Headers) {
    return {
      get(name: string) {
        return src.get(name);
      },
    };
  }
  if ('get' in src && typeof (src as { get?: unknown }).get === 'function') {
    const g = (src as { get: (name: string) => string | null | undefined }).get.bind(src);
    return {
      get(name: string) {
        const v = g(name);
        if (v == null) return null;
        return v;
      },
    };
  }
  const rec = src as Record<string, string | string[] | undefined>;
  return {
    get(name: string) {
      const lower = name.toLowerCase();
      const key = Object.keys(rec).find((k) => k.toLowerCase() === lower);
      if (!key) return null;
      const v = rec[key];
      if (Array.isArray(v)) return v[0] ?? null;
      return v ?? null;
    },
  };
}

export type AppwriteAuthProject = {
  endpoint: string;
  projectId: string;
};

/**
 * Verifies the caller using JWT first, then the Appwrite SSR session cookie.
 * Does not use API keys — safe for per-request user context.
 */
export async function verifyAppwriteUser(
  headers: IncomingHeaderSource,
  project: AppwriteAuthProject,
): Promise<VerifyAppwriteUserResult> {
  const h = normalizeHeaderSource(headers);
  const authorizationHeader = h.get('authorization');
  const cookieHeader = h.get('cookie');
  const jwt = extractBearerToken(authorizationHeader ?? undefined);
  if (jwt) {
    const userId = await getUserIdFromJwt(jwt, project.endpoint, project.projectId);
    if (userId) return { ok: true, userId, via: 'jwt' };
    return { ok: false, reason: 'invalid' };
  }

  const cookies = parseCookieHeader(cookieHeader);
  const sessionName = appwriteSessionCookieName(project.projectId);
  const sessionSecret = cookies[sessionName] ?? null;
  if (!sessionSecret?.trim()) {
    return { ok: false, reason: 'missing' };
  }
  const userId = await getUserIdFromSessionSecret(sessionSecret, project.endpoint, project.projectId);
  if (userId) return { ok: true, userId, via: 'session' };
  return { ok: false, reason: 'invalid' };
}

/**
 * Same as {@link verifyAppwriteUser} using env from {@link getAppwriteServerEnv} (endpoint + project id).
 */
export async function verifyAppwriteUserFromEnv(headers: IncomingHeaderSource): Promise<VerifyAppwriteUserResult> {
  const env = getAppwriteServerEnv();
  return verifyAppwriteUser(headers, { endpoint: env.endpoint, projectId: env.projectId });
}

/**
 * Returns the authenticated user or throws {@link PlatformApiHttpError} (401).
 */
function projectFromOptions(options: {
  project?: AppwriteAuthProject;
  env?: Pick<AppwriteServerEnv, 'endpoint' | 'projectId'>;
}): AppwriteAuthProject {
  if (options.project) return options.project;
  if (options.env) return { endpoint: options.env.endpoint, projectId: options.env.projectId };
  const e = getAppwriteServerEnv();
  return { endpoint: e.endpoint, projectId: e.projectId };
}

export async function requireAppwriteUser(
  headers: IncomingHeaderSource,
  options: {
    project?: AppwriteAuthProject;
    env?: Pick<AppwriteServerEnv, 'endpoint' | 'projectId'>;
    requestId?: string;
  } = {},
): Promise<VerifiedAppwriteUser> {
  const project = projectFromOptions(options);
  const r = await verifyAppwriteUser(headers, project);
  if (r.ok) return { userId: r.userId, via: r.via };
  if (r.reason === 'missing') {
    throw PlatformApiHttpError.unauthorized('Authentication required', {
      requestId: options.requestId,
      code: 'UNAUTHORIZED',
    });
  }
  throw PlatformApiHttpError.unauthorized('Invalid or expired session', {
    requestId: options.requestId,
    code: 'UNAUTHORIZED',
  });
}
