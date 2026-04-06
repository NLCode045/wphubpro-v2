import { functions } from '../../services/appwrite';
import { AppwriteFunctionError } from './errors';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface ExecuteFunctionOptions {
  path?: string;
  method?: HttpMethod;
  isAsync?: boolean;
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
    parseJson = true,
    throwOnHttpError = true,
  } = options;

  const body =
    payload === undefined
      ? undefined
      : typeof payload === 'string'
        ? payload
        : JSON.stringify(payload);

  const execution = await functions.createExecution(functionId, body, isAsync, path, method as any);

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
