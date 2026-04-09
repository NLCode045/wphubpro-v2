import {
  APPWRITE_ENDPOINT,
  APPWRITE_PROJECT_ID,
  client,
  functions,
} from '../../services/appwrite';
import { AppwriteFunctionError } from './errors';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/** Minimal execution shape from REST (SDK-compatible fields we read). */
type ExecutionRecord = {
  $id: string;
  status?: string;
  responseStatusCode?: number;
  responseBody?: string;
  errors?: string;
};

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const HDR_IMPERSONATE_ID = 'X-Appwrite-Impersonate-User-Id';
const HDR_IMPERSONATE_EMAIL = 'X-Appwrite-Impersonate-User-Email';
const HDR_IMPERSONATE_PHONE = 'X-Appwrite-Impersonate-User-Phone';

async function withImpersonationHeadersStripped<T>(fn: () => Promise<T>): Promise<T> {
  const h = client.headers as Record<string, string>;
  const saved = {
    id: h[HDR_IMPERSONATE_ID],
    email: h[HDR_IMPERSONATE_EMAIL],
    phone: h[HDR_IMPERSONATE_PHONE],
  };
  try {
    delete h[HDR_IMPERSONATE_ID];
    delete h[HDR_IMPERSONATE_EMAIL];
    delete h[HDR_IMPERSONATE_PHONE];
    return await fn();
  } finally {
    if (saved.id) h[HDR_IMPERSONATE_ID] = saved.id;
    else delete h[HDR_IMPERSONATE_ID];
    if (saved.email) h[HDR_IMPERSONATE_EMAIL] = saved.email;
    else delete h[HDR_IMPERSONATE_EMAIL];
    if (saved.phone) h[HDR_IMPERSONATE_PHONE] = saved.phone;
    else delete h[HDR_IMPERSONATE_PHONE];
  }
}

function isTerminalExecutionStatus(status: string | undefined): boolean {
  const s = (status || '').toLowerCase();
  return s === 'completed' || s === 'failed' || s === 'canceled' || s === 'cancelled';
}

function executionEndpointBase(): string {
  const endpoint = (APPWRITE_ENDPOINT || '').trim();
  if (!endpoint) {
    throw new Error(
      'APPWRITE_ENDPOINT is not configured. Please set APPWRITE_ENDPOINT in your .env file.'
    );
  }
  return `${endpoint.replace(/\/$/, '')}/functions`;
}

const guestFetchHeaders: Record<string, string> = {
  'X-Appwrite-Project': APPWRITE_PROJECT_ID,
  'X-Appwrite-Response-Format': '1.8.0',
};

const getErrorMessage = (parsedBody: unknown, fallback: string): string => {
  if (parsedBody && typeof parsedBody === 'object') {
    const parsed = parsedBody as Record<string, unknown>;
    if (typeof parsed.message === 'string' && parsed.message) return parsed.message;
    if (typeof parsed.error === 'string' && parsed.error) return parsed.error;
  }

  if (typeof parsedBody === 'string' && parsedBody) return parsedBody;
  return fallback;
};

/**
 * Create a function execution without attaching the logged-in session (no JWT / session cookie).
 * Needed when the browser holds an MFA-pending session: Appwrite rejects normal SDK calls with
 * "More factors are required…" but guest `execute: any` functions should still run.
 */
async function guestCreateExecution(
  functionId: string,
  bodyPayload: string | undefined,
  opts: { async: boolean; path?: string; method?: HttpMethod },
): Promise<ExecutionRecord> {
  const reqBody: Record<string, unknown> = {
    body: bodyPayload ?? '',
    async: opts.async,
  };
  if (opts.path !== undefined) reqBody.path = opts.path;
  if (opts.method !== undefined) reqBody.method = opts.method;

  const url = `${executionEndpointBase()}/${encodeURIComponent(functionId)}/executions`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { ...guestFetchHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify(reqBody),
    credentials: 'omit',
    mode: 'cors',
  });
  const rawText = await res.text();
  let parsed: unknown = null;
  if (rawText.trim()) {
    try {
      parsed = JSON.parse(rawText);
    } catch {
      parsed = rawText;
    }
  }
  if (!res.ok) {
    throw new AppwriteFunctionError({
      message: getErrorMessage(parsed, `Function "${functionId}" failed with HTTP ${res.status}`),
      functionId,
      statusCode: res.status,
      rawBody: rawText,
      parsedBody: parsed,
    });
  }
  return parsed as ExecutionRecord;
}

async function guestGetExecution(functionId: string, executionId: string): Promise<ExecutionRecord> {
  const url = `${executionEndpointBase()}/${encodeURIComponent(functionId)}/executions/${encodeURIComponent(executionId)}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: guestFetchHeaders,
    credentials: 'omit',
    mode: 'cors',
  });
  const rawText = await res.text();
  let parsed: unknown = null;
  if (rawText.trim()) {
    try {
      parsed = JSON.parse(rawText);
    } catch {
      parsed = rawText;
    }
  }
  if (!res.ok) {
    throw new AppwriteFunctionError({
      message: getErrorMessage(parsed, `Get execution failed with HTTP ${res.status}`),
      functionId,
      statusCode: res.status,
      rawBody: rawText,
      parsedBody: parsed,
    });
  }
  return parsed as ExecutionRecord;
}

/**
 * Appwrite Cloud caps synchronous `createExecution(..., false)` at ~30s. Use async + poll to wait longer
 * (up to {@link ExecuteFunctionOptions.maxAsyncWaitMs}, bounded by the function’s configured timeout).
 */
async function waitForExecutionResult(
  functionId: string,
  executionId: string,
  maxWaitMs: number,
  pollIntervalMs: number,
  guestExecution: boolean,
) {
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    const ex = guestExecution
      ? await guestGetExecution(functionId, executionId)
      : await functions.getExecution(functionId, executionId);
    if (isTerminalExecutionStatus(ex.status)) {
      return ex;
    }
    await sleep(pollIntervalMs);
  }
  throw new Error(
    `Function "${functionId}" did not finish within ${maxWaitMs}ms (async execution poll timeout).`,
  );
}

export interface ExecuteFunctionOptions {
  path?: string;
  method?: HttpMethod;
  isAsync?: boolean;
  /**
   * When true, runs the function asynchronously and polls until it completes (or {@link maxAsyncWaitMs}).
   * Use only when work may exceed Appwrite’s ~30s synchronous wait: on Appwrite Cloud, async executions
   * often omit `responseBody` on `getExecution`, so callers that need JSON in the response must stay synchronous.
   */
  longRunning?: boolean;
  /** Max time to poll when `longRunning` is true (default 60_000). */
  maxAsyncWaitMs?: number;
  parseJson?: boolean;
  throwOnHttpError?: boolean;
  /**
   * Do not send the user session. Use for `execute: any` functions on the login screen when an
   * MFA-incomplete JWT would make Appwrite reject the request.
   */
  guestExecution?: boolean;
  /**
   * Temporarily remove REST impersonation headers for this execution so Appwrite attributes the
   * call to the real session user (needed for admin-only functions while impersonating).
   */
  omitImpersonationHeaders?: boolean;
}

export interface ExecuteFunctionResult<T> {
  data: T;
  statusCode: number;
  rawBody: string;
  executionStatus: string;
  executionErrors: string;
}

const parseResponseBody = (body: string, parseJson: boolean): unknown => {
  if (!body) return null;
  if (!parseJson) return body;

  const trimmed = body.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return body;
    }
  }

  return body;
};

export async function executeFunctionWithMeta<TResponse = unknown, TPayload = unknown>(
  functionId: string,
  payload?: TPayload,
  options: ExecuteFunctionOptions = {}
): Promise<ExecuteFunctionResult<TResponse>> {
  const {
    path,
    method,
    isAsync = false,
    longRunning = false,
    maxAsyncWaitMs = 60_000,
    parseJson = true,
    throwOnHttpError = true,
    guestExecution = false,
    omitImpersonationHeaders = false,
  } = options;

  const body =
    payload === undefined
      ? undefined
      : typeof payload === 'string'
        ? payload
        : JSON.stringify(payload);

  const runAsync = longRunning ? true : isAsync;

  const runCreateExecution = async (): Promise<ExecutionRecord> => {
    if (guestExecution) {
      return guestCreateExecution(functionId, body, {
        async: runAsync,
        path,
        method,
      });
    }
    return (await functions.createExecution(
      functionId,
      body,
      runAsync,
      path,
      method as any,
    )) as ExecutionRecord;
  };

  let execution: ExecutionRecord;
  
  // Debug logging
  if (omitImpersonationHeaders || guestExecution) {
    const h = client.headers as Record<string, string>;
    console.debug(`[executeFunction] ${functionId}`, {
      omitImpersonationHeaders,
      guestExecution,
      headers: {
        'X-Appwrite-Impersonate-User-Id': h['X-Appwrite-Impersonate-User-Id'] || '(not set)',
        'X-Appwrite-User-Id': h['X-Appwrite-User-Id'] || '(not set)',
        'X-Appwrite-Project': h['X-Appwrite-Project'] || '(not set)',
      },
      payloadSize: body?.length || 0,
      payload: body ? JSON.parse(body) : undefined,
    });
  }
  
  if (omitImpersonationHeaders && !guestExecution) {
    execution = await withImpersonationHeadersStripped(runCreateExecution);
  } else {
    execution = await runCreateExecution();
  }

  if (longRunning) {
    if (!isTerminalExecutionStatus(execution.status)) {
      const execId = execution.$id;
      const poll = () =>
        waitForExecutionResult(functionId, execId, maxAsyncWaitMs, 600, guestExecution);
      execution =
        omitImpersonationHeaders && !guestExecution
          ? await withImpersonationHeadersStripped(poll)
          : await poll();
    }
  }

  const statusCode = execution.responseStatusCode || 0;
  const rawBody = execution.responseBody || '';
  const parsedBody = parseResponseBody(rawBody, parseJson);
  const fallbackMessage =
    statusCode > 0
      ? `Function "${functionId}" failed with status ${statusCode}`
      : `Function "${functionId}" failed`;

  if (throwOnHttpError && (statusCode < 200 || statusCode >= 300)) {
    throw new AppwriteFunctionError({
      message: getErrorMessage(parsedBody, fallbackMessage),
      functionId,
      statusCode,
      rawBody,
      parsedBody,
    });
  }

  return {
    data: parsedBody as TResponse,
    statusCode,
    rawBody,
    executionStatus: execution.status || '',
    executionErrors: execution.errors || '',
  };
}

export async function executeFunction<TResponse = unknown, TPayload = unknown>(
  functionId: string,
  payload?: TPayload,
  options: ExecuteFunctionOptions = {}
): Promise<TResponse> {
  const { data } = await executeFunctionWithMeta<TResponse, TPayload>(functionId, payload, options);
  return data;
}

/**
 * Start an async function execution and return the execution ID immediately.
 * Caller is responsible for polling the execution status.
 * Use this for long-running operations where you want to return immediately.
 */
export async function startAsyncExecution<TPayload = unknown>(
  functionId: string,
  payload?: TPayload
): Promise<{ executionId: string }> {
  const body =
    payload === undefined
      ? undefined
      : typeof payload === 'string'
        ? payload
        : JSON.stringify(payload);

  const execution = await functions.createExecution(
    functionId,
    body,
    false,  // Async - don't wait for response
  );

  return { executionId: execution.$id };
}

/**
 * Poll an async function execution until it completes or times out.
 * Use this after startAsyncExecution to retrieve the result.
 */
export async function pollAsyncExecution<TResponse = unknown>(
  functionId: string,
  executionId: string,
  maxWaitMs: number = 300_000,  // 5 minutes default
  pollIntervalMs: number = 2_000  // 2 second poll interval
): Promise<TResponse> {
  const execution = await waitForExecutionResult(
    functionId,
    executionId,
    maxWaitMs,
    pollIntervalMs,
    false
  );

  if (execution.status !== 'completed') {
    throw new Error(`Execution "${executionId}" failed with status "${execution.status}": ${execution.errors}`);
  }

  const rawBody = execution.responseBody || '';
  if (!rawBody) {
    throw new Error(`Execution "${executionId}" completed but returned no response body`);
  }

  try {
    return JSON.parse(rawBody) as TResponse;
  } catch (err) {
    throw new Error(`Failed to parse execution response: ${err instanceof Error ? err.message : String(err)}`);
  }
}
