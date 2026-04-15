/**
 * Server-only — HTTP entry for `/api/bridge/*` (mount on your API host). Do not import from React.
 */
import { ApiError, jsonFromApiError, jsonResponse, type JsonResponseParts } from '../appwrite/apiResponse';
import { createApiLogger } from '../appwrite/logger';
import { getAppwriteServerEnv } from '../appwrite/serverEnv';
import { requireAuthenticatedUser } from '../appwrite/userSession';
import { assertBodySizeWithinLimit } from './validate';
import { runWpProxyForUser, type WpProxyRequestBody } from './wpProxy';

function normalizeBridgePath(pathname: string): string {
  let p = pathname.trim() || '/';
  if (p.startsWith('/api')) p = p.slice('/api'.length) || '/';
  if (p.startsWith('/bridge')) p = p.slice('/bridge'.length) || '/';
  return p;
}

/**
 * Handle a single bridge request. Pass pathname as seen after your router strips `/api` (e.g. `/bridge/wp-proxy`)
 * or the full path your stack uses.
 */
export async function handleBridgeRequest(input: {
  method: string;
  pathname: string;
  authorizationHeader?: string | null;
  cookieHeader?: string | null;
  bodyText: string;
  requestId?: string;
}): Promise<JsonResponseParts> {
  const log = createApiLogger('bridge', input.requestId);
  const env = getAppwriteServerEnv();

  try {
    assertBodySizeWithinLimit(input.bodyText);
    const method = input.method.trim().toUpperCase();
    if (method !== 'POST') {
      throw new ApiError(405, 'METHOD_NOT_ALLOWED', 'Use POST');
    }

    const path = normalizeBridgePath(input.pathname);
    if (path !== '/wp-proxy') {
      throw new ApiError(404, 'NOT_FOUND', 'Unknown bridge route');
    }

    const userId = await requireAuthenticatedUser({
      authorizationHeader: input.authorizationHeader ?? null,
      cookieHeader: input.cookieHeader ?? null,
      endpoint: env.endpoint,
      projectId: env.projectId,
    });

    let payload: WpProxyRequestBody;
    try {
      payload = JSON.parse(input.bodyText || '{}') as WpProxyRequestBody;
    } catch {
      throw new ApiError(400, 'INVALID_JSON', 'Invalid JSON body');
    }

    const { status, json } = await runWpProxyForUser(userId, payload);
    return jsonResponse(json, status);
  } catch (e) {
    log.error('bridge handler error', {
      err: e instanceof Error ? e.message : String(e),
    });
    return jsonFromApiError(e, input.requestId);
  }
}
