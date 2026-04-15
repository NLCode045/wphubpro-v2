'use strict';

/**
 * HTTP / JSON helpers for Appwrite Functions (self-hosted and Appwrite Cloud).
 * Bundle this file with functions that need shared parsing and response helpers.
 *
 * Request shape: use `req.bodyJson` and `req.bodyText` as primary inputs; legacy
 * `req.body` / `req.bodyRaw` / `req.payload` remain for compatibility.
 *
 * @see https://appwrite.io/docs/products/functions/develop
 * @see https://appwrite.io/docs/products/functions/domains
 */

/**
 * @typedef {Object} AppwriteFunctionRequest
 * @property {Record<string, string|undefined>} [headers]
 * @property {string} [method]
 * @property {string} [path]
 * @property {string} [url]
 * @property {Record<string, unknown>} [query]
 * @property {object} [bodyJson]
 * @property {string} [bodyText]
 * @property {string|object} [body]
 * @property {string} [bodyRaw]
 * @property {string|object} [payload]
 */

/**
 * @typedef {{ kind: 'unknown'|'appwrite_run'|'appwrite_network'|'custom', host: string|null }} FunctionDomainKind
 */

/**
 * Parsed JSON body from an Appwrite function request (body only, no query fallback).
 * @param {AppwriteFunctionRequest|null|undefined} req
 */
function parsePayload(req) {
  if (!req) return {};

  if (req.bodyJson != null && typeof req.bodyJson === 'object') {
    return req.bodyJson;
  }

  if (typeof req.bodyText === 'string') {
    const tt = req.bodyText.trim();
    if (tt) {
      try {
        return JSON.parse(tt);
      } catch {
        return {};
      }
    }
  }

  if (req.body && typeof req.body === 'object') return req.body;

  if (req.body && typeof req.body === 'string') {
    const tb = req.body.trim();
    if (!tb) return {};
    try {
      return JSON.parse(tb);
    } catch {
      return {};
    }
  }

  if (req.payload && typeof req.payload === 'object') return req.payload;

  if (req.bodyRaw && typeof req.bodyRaw === 'string') {
    const t = req.bodyRaw.trim();
    if (!t) return {};
    try {
      return JSON.parse(t);
    } catch {
      return {};
    }
  }

  if (req.payload && typeof req.payload === 'string') {
    const t = req.payload.trim();
    if (!t) return {};
    try {
      return JSON.parse(t);
    } catch {
      return {};
    }
  }

  const raw = req.payload || req.bodyRaw || req.body;
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return {};
    try {
      return JSON.parse(trimmed);
    } catch {
      return {};
    }
  }

  return {};
}

/**
 * Parsed JSON body from an Appwrite function request (body only, no query fallback).
 * @param {AppwriteFunctionRequest|null|undefined} req
 */
function parsePayloadLegacy(req) {
  if (!req) return {};
  if (req.body && typeof req.body === "object") return req.body;
  if (req.bodyRaw && typeof req.bodyRaw === "string") {
    try { return JSON.parse(req.bodyRaw); } catch { return {}; }
  }
  if (req.payload && typeof req.payload === "string") {
    try { return JSON.parse(req.payload); } catch { return {}; }
  }
  if (req.payload && typeof req.payload === "object") return req.payload;
  return {};
}


/**
 * Parse body first; if no usable body, fall back to `req.query` (admin-style handlers).
 * @param {AppwriteFunctionRequest|null|undefined} req
 */
function parsePayloadOrQuery(req) {
  if (!req) return {};

  if (req.bodyJson != null && typeof req.bodyJson === 'object') {
    return req.bodyJson;
  }

  if (typeof req.bodyText === 'string') {
    const tt = req.bodyText.trim();
    if (tt) {
      try {
        return JSON.parse(tt);
      } catch {
        return {};
      }
    }
  }

  if (req.body && typeof req.body === 'object') return req.body;

  if (req.body && typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }

  if (req.bodyRaw && typeof req.bodyRaw === 'string') {
    try {
      return JSON.parse(req.bodyRaw);
    } catch {
      return {};
    }
  }

  if (req.payload && typeof req.payload === 'string') {
    try {
      return JSON.parse(req.payload);
    } catch {
      return {};
    }
  }

  if (req.payload && typeof req.payload === 'object') return req.payload;

  return req.query || {};
}

/**
 * @param {AppwriteFunctionRequest|null|undefined} req
 * @param {object|undefined|null} payloadFromIndex
 */
function parsePayloadOr(req, payloadFromIndex) {
  if (payloadFromIndex != null && typeof payloadFromIndex === 'object') {
    return payloadFromIndex;
  }
  return parsePayload(req);
}

/**
 * @param {string|null|undefined} host
 * @returns {FunctionDomainKind}
 */
function classifyFunctionDomainHost(host) {
  if (!host || typeof host !== 'string') {
    return { kind: 'unknown', host: null };
  }
  const h = host.split(':')[0].trim().toLowerCase();
  if (!h) return { kind: 'unknown', host: null };
  if (h.endsWith('.appwrite.run')) return { kind: 'appwrite_run', host: h };
  if (h.endsWith('.appwrite.network')) return { kind: 'appwrite_network', host: h };
  return { kind: 'custom', host: h };
}

/** @param {AppwriteFunctionRequest|null|undefined} req */
function getRequestHost(req) {
  const h = req?.headers;
  if (!h || typeof h !== 'object') return null;
  return h.host || h.Host || h['x-forwarded-host'] || h['X-Forwarded-Host'] || null;
}

/** @param {AppwriteFunctionRequest|null|undefined} req */
function getRequestPath(req) {
  const p = req?.path || req?.url || '';
  if (typeof p !== 'string') return '';
  const q = p.indexOf('?');
  return q >= 0 ? p.slice(0, q) : p;
}

/** @param {AppwriteFunctionRequest|null|undefined} req */
function getFunctionDomainResponseType(req) {
  const q = req?.query;
  if (!q || typeof q !== 'object') return null;
  const t = q.type ?? q.Type;
  if (t == null || typeof t !== 'string') return null;
  const s = t.trim().toLowerCase();
  const allowed = new Set(['json', 'text', 'html', 'redirect', 'empty']);
  return allowed.has(s) ? s : s || null;
}

/**
 * Safe snapshot of request / domain context (no secrets, no raw body).
 * @param {AppwriteFunctionRequest|null|undefined} req
 */
function getFunctionDomainContext(req) {
  const headers = req?.headers || {};
  const host = getRequestHost(req);
  const domain = classifyFunctionDomainHost(host);
  const method = (req?.method || 'GET').toString().toUpperCase();
  const url = typeof req?.url === 'string' ? req.url : null;
  const path = getRequestPath(req);
  const query =
    req?.query && typeof req.query === 'object' && !Array.isArray(req.query) ? { ...req.query } : null;
  const responseType = getFunctionDomainResponseType(req);

  return {
    method,
    host,
    domain,
    url,
    path,
    query,
    responseType,
    scheme:
      headers['x-forwarded-proto'] ||
      headers['X-Forwarded-Proto'] ||
      headers['x-forwarded-protocol'] ||
      null,
  };
}

/** Environment injected by the Appwrite executor (useful for logs and URL building). */
function getFunctionDomainRuntimeHints() {
  return {
    functionId: process.env.APPWRITE_FUNCTION_ID || null,
    functionName: process.env.APPWRITE_FUNCTION_NAME || null,
    deploymentId: process.env.APPWRITE_FUNCTION_DEPLOYMENT || null,
    projectId: process.env.APPWRITE_FUNCTION_PROJECT_ID || null,
    apiEndpoint:
      process.env.APPWRITE_FUNCTION_API_ENDPOINT || process.env.APPWRITE_FUNCTION_ENDPOINT || null,
  };
}

function createClient(sdkLib, { endpoint, projectId, apiKey }) {
  const client = new sdkLib.Client().setEndpoint(endpoint).setProject(projectId);
  if (apiKey) client.setKey(apiKey);
  return client;
}

/**
 * Build `node-appwrite` client from function / project env (same pattern as other v2-repos functions).
 * Never logs or returns the API key.
 */
function createAppwriteClient(sdkLib) {
  const endpoint =
    process.env.APPWRITE_ENDPOINT ||
    process.env.APPWRITE_FUNCTION_API_ENDPOINT ||
    process.env.APPWRITE_FUNCTION_ENDPOINT ||
    '';
  const projectId =
    process.env.APPWRITE_PROJECT_ID || process.env.APPWRITE_FUNCTION_PROJECT_ID || '';
  const apiKey =
    process.env.APPWRITE_API_KEY ||
    process.env.APPWRITE_FUNCTION_API_KEY ||
    process.env.APPWRITE_KEY ||
    '';

  const meta = {
    endpointSet: Boolean(endpoint),
    projectIdSet: Boolean(projectId),
    apiKeySet: Boolean(apiKey),
  };

  if (!endpoint || !projectId) {
    return { meta, client: null, skipReason: 'APPWRITE_ENDPOINT (or FUNCTION_* endpoint) and PROJECT_ID required' };
  }

  const client = new sdkLib.Client().setEndpoint(endpoint).setProject(projectId);
  if (apiKey) {
    client.setKey(apiKey);
  }

  return { meta, client, skipReason: null };
}

function ok(res, payload = {}, statusCode = 200) {
  return res.json(payload, statusCode);
}

function fail(res, message, statusCode = 500, extra = {}) {
  return res.json({ success: false, message, ...extra }, statusCode);
}

function success(res, data = {}, status = 200) {
  return res.json({ success: true, ...data }, status);
}

module.exports = {
  parsePayload,
  parsePayloadLegacy,
  parsePayloadOrQuery,
  parsePayloadOr,
  classifyFunctionDomainHost,
  getRequestHost,
  getRequestPath,
  getFunctionDomainResponseType,
  getFunctionDomainContext,
  getFunctionDomainRuntimeHints,
  createClient,
  createAppwriteClient,
  ok,
  fail,
  success,
};
