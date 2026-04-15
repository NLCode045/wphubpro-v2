/**
 * Server-only — bridge request validation (SSRF / abuse guards).
 */
import { ApiError } from '../appwrite/apiResponse';

const MAX_BODY_JSON_BYTES = 512_000;

/** Relative REST path under `/wp-json/` (e.g. `wphubpro/v1/health/push`). */
const ALLOWED_ENDPOINT = /^wphubpro\/v1\/[a-zA-Z0-9/_-]+$/;

export function assertAllowlistedBridgeEndpoint(endpoint: string): void {
  const e = endpoint.trim().replace(/^\/+/, '');
  if (!e || e.length > 256) {
    throw new ApiError(400, 'INVALID_ENDPOINT', 'endpoint is required');
  }
  if (e.includes('..') || e.includes('://') || e.includes('//')) {
    throw new ApiError(400, 'INVALID_ENDPOINT', 'endpoint is not allowlisted');
  }
  if (!ALLOWED_ENDPOINT.test(e)) {
    throw new ApiError(400, 'INVALID_ENDPOINT', 'endpoint must match wphubpro/v1/...');
  }
}

const METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);

export function normalizeHttpMethod(method: string): string {
  return method.trim().toUpperCase();
}

export function assertAllowedMethod(method: string): string {
  const m = normalizeHttpMethod(method);
  if (!METHODS.has(m)) {
    throw new ApiError(400, 'INVALID_METHOD', 'method is not allowed');
  }
  return m;
}

export function assertBodySizeWithinLimit(bodyText: string | undefined | null): void {
  if (!bodyText) return;
  const n = Buffer.byteLength(bodyText, 'utf8');
  if (n > MAX_BODY_JSON_BYTES) {
    throw new ApiError(413, 'PAYLOAD_TOO_LARGE', 'Request body too large');
  }
}
