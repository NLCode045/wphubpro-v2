/**
 * Server-only — shared helpers for `/api/appwrite` and `/api/bridge` handlers.
 * Do not import from React.
 */

export { getAdminClients, type AdminClients } from './adminClients';
export {
  ApiError,
  jsonFromApiError,
  jsonResponse,
  type ApiErrorBody,
  type JsonResponseParts,
} from './apiResponse';
export { createApiLogger, type ApiLogger } from './logger';
export {
  assertServerConfigured,
  getAppwriteServerEnv,
  type AppwriteServerEnv,
} from './serverEnv';
export { DEFAULT_MAX_JSON_BYTES, parseJsonBody, type ParseJsonBodyResult } from './requestBody';
export {
  appwriteSessionCookieName,
  extractBearerToken,
  getAuthorizationHeader,
  getUserIdFromJwt,
  getUserIdFromSessionSecret,
  parseCookieHeader,
  requireAuthenticatedUser,
  requireUserIdFromJwt,
} from './userSession';
