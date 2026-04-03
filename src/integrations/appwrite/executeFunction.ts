import { functions } from '../../services/appwrite';
import { AppwriteFunctionError } from './errors';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function isTerminalExecutionStatus(status: string | undefined): boolean {
  const s = (status || '').toLowerCase();
  return s === 'completed' || s === 'failed' || s === 'canceled' || s === 'cancelled';
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
) {
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    const ex = await functions.getExecution(functionId, executionId);
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

const getErrorMessage = (parsedBody: unknown, fallback: string): string => {
  if (parsedBody && typeof parsedBody === 'object') {
    const parsed = parsedBody as Record<string, unknown>;
    if (typeof parsed.message === 'string' && parsed.message) return parsed.message;
    if (typeof parsed.error === 'string' && parsed.error) return parsed.error;
  }

  if (typeof parsedBody === 'string' && parsedBody) return parsedBody;
  return fallback;
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
  } = options;

  const body =
    payload === undefined
      ? undefined
      : typeof payload === 'string'
        ? payload
        : JSON.stringify(payload);

  let execution = await functions.createExecution(
    functionId,
    body,
    longRunning ? true : isAsync,
    path,
    method as any,
  );

  if (longRunning) {
    if (!isTerminalExecutionStatus(execution.status)) {
      execution = await waitForExecutionResult(functionId, execution.$id, maxAsyncWaitMs, 600);
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
