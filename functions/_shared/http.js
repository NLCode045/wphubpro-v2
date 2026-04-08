/**
 * Shared HTTP / JSON helpers for Appwrite functions (v2-repos).
 * Defensive JSON parsing: invalid or empty string bodies yield {}.
 *
 * Appwrite recommends req.bodyJson / req.bodyText over deprecated req.body / req.bodyRaw.
 * @see https://appwrite.io/docs/products/functions/development
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
 * Like legacy admin handlers: parse body/payload, then fall back to `req.query` if none set.
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
 * Prefer payload from a parent router when provided; else parse from req.
 */
function parsePayloadOr(req, payloadFromIndex) {
  if (payloadFromIndex != null && typeof payloadFromIndex === 'object') {
    return payloadFromIndex;
  }
  return parsePayload(req);
}

function createClient(sdkLib, { endpoint, projectId, apiKey }) {
  const client = new sdkLib.Client().setEndpoint(endpoint).setProject(projectId);
  if (apiKey) client.setKey(apiKey);
  return client;
}

function ok(res, payload = {}, statusCode = 200) {
  return res.json(payload, statusCode);
}

function fail(res, message, statusCode = 500, extra = {}) {
  return res.json({ success: false, message, ...extra }, statusCode);
}

/** Gateway-style success: { success: true, ...data } */
function success(res, data = {}, status = 200) {
  return res.json({ success: true, ...data }, status);
}

module.exports = {
  parsePayload,
  parsePayloadOrQuery,
  parsePayloadOr,
  createClient,
  ok,
  fail,
  success,
};
