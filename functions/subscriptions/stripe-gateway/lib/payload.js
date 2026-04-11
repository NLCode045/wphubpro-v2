function parsePayload(req) {
  if (!req) return {};
  if (req.body && typeof req.body === 'object') return req.body;
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
  return {};
}

/** Merge `{ action, payload: { ... } }` from consumers so handlers read fields at top level. */
function mergeNestedPayload(raw) {
  if (!raw || typeof raw !== 'object') return {};
  if (raw.payload != null && typeof raw.payload === 'object' && !Array.isArray(raw.payload)) {
    return { ...raw, ...raw.payload };
  }
  return raw;
}

module.exports = { parsePayload, mergeNestedPayload };
