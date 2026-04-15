/**
 * Server-only — JSON error shape for `/api/appwrite` and `/api/bridge`. Do not import from React.
 */

export type ApiErrorBody = {
  ok: false;
  error: {
    code: string;
    message: string;
  };
  requestId?: string;
};

export class ApiError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly cause?: unknown;

  constructor(statusCode: number, code: string, message: string, cause?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.cause = cause;
  }

  toJSON(requestId?: string): ApiErrorBody {
    return {
      ok: false,
      error: { code: this.code, message: this.message },
      ...(requestId ? { requestId } : {}),
    };
  }
}

export type JsonResponseParts = {
  status: number;
  body: string;
  headers: Record<string, string>;
};

export function jsonResponse(
  payload: unknown,
  status = 200,
  extraHeaders?: Record<string, string>,
): JsonResponseParts {
  return {
    status,
    body: JSON.stringify(payload),
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      ...extraHeaders,
    },
  };
}

export function jsonFromApiError(err: unknown, requestId?: string): JsonResponseParts {
  if (err instanceof ApiError) {
    return jsonResponse(err.toJSON(requestId), err.statusCode);
  }
  const message = err instanceof Error ? err.message : String(err);
  return jsonResponse(
    {
      ok: false,
      error: { code: 'INTERNAL', message: message || 'Internal error' },
      ...(requestId ? { requestId } : {}),
    },
    500,
  );
}
