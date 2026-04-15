/**
 * Server-only — JSON error bodies for `/api/appwrite` and `/api/bridge`.
 * Aligns with `{ success: false, message }` used across Appwrite functions and `platform-api.ts` consumers.
 */

export type ApiErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'BAD_REQUEST'
  | 'NOT_FOUND'
  | 'PAYLOAD_TOO_LARGE'
  | 'CONFLICT'
  | 'INTERNAL'
  | 'SERVICE_UNAVAILABLE';

export type ApiErrorBody = {
  success: false;
  message: string;
  code?: ApiErrorCode;
  /** Correlate client errors with server logs; safe to expose. */
  requestId?: string;
};

export class PlatformApiHttpError extends Error {
  readonly statusCode: number;
  readonly body: ApiErrorBody;

  constructor(statusCode: number, body: ApiErrorBody, message?: string) {
    super(message ?? body.message);
    this.name = 'PlatformApiHttpError';
    this.statusCode = statusCode;
    this.body = body;
  }

  static unauthorized(message = 'Unauthorized', opts?: { requestId?: string; code?: ApiErrorCode }): PlatformApiHttpError {
    return new PlatformApiHttpError(
      401,
      { success: false, message, code: opts?.code ?? 'UNAUTHORIZED', requestId: opts?.requestId },
      message,
    );
  }

  static forbidden(message = 'Forbidden', opts?: { requestId?: string }): PlatformApiHttpError {
    return new PlatformApiHttpError(403, { success: false, message, code: 'FORBIDDEN', requestId: opts?.requestId }, message);
  }

  static badRequest(message: string, opts?: { requestId?: string }): PlatformApiHttpError {
    return new PlatformApiHttpError(400, { success: false, message, code: 'BAD_REQUEST', requestId: opts?.requestId }, message);
  }

  static notFound(message = 'Not found', opts?: { requestId?: string }): PlatformApiHttpError {
    return new PlatformApiHttpError(404, { success: false, message, code: 'NOT_FOUND', requestId: opts?.requestId }, message);
  }

  static internal(message = 'Internal error', opts?: { requestId?: string }): PlatformApiHttpError {
    return new PlatformApiHttpError(
      500,
      { success: false, message, code: 'INTERNAL', requestId: opts?.requestId },
      message,
    );
  }
}

export function isPlatformApiHttpError(e: unknown): e is PlatformApiHttpError {
  return e instanceof PlatformApiHttpError;
}

export function jsonBody(obj: unknown): string {
  return JSON.stringify(obj);
}

export function jsonResponse(body: ApiErrorBody | Record<string, unknown>, status: number): Response {
  return new Response(jsonBody(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

export function errorResponse(err: PlatformApiHttpError): Response {
  return jsonResponse(err.body, err.statusCode);
}
