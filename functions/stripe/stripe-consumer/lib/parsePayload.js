/** Parse Appwrite function request body (same pattern as legacy stripe consumers). */
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

/** Remove router-only fields before forwarding to stripe-gateway. */
function stripRoutingMeta(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return payload;
  const rest = { ...payload };
  delete rest.stripeScope;
  delete rest.stripeConsumer;
  return rest;
}

module.exports = { parsePayload, stripRoutingMeta };
