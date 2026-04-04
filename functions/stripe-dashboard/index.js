/**
 * Stripe dashboard — admin-only placeholder until dashboard APIs are wired.
 * Matches other billing functions: handles deploy/runtime POST probes.
 */

function parsePayload(req) {
  if (!req) return {};
  if (req.body && typeof req.body === 'object') return req.body;
  if (req.payload && typeof req.payload === 'object') return req.payload;
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

function requestPath(req) {
  const p = req.path || req.url || '';
  if (typeof p !== 'string') return '';
  const q = p.indexOf('?');
  return q >= 0 ? p.slice(0, q) : p;
}

module.exports = async ({ req, res, log, error }) => {
  try {
    const method = (req.method || 'POST').toString().toUpperCase();
    const path = requestPath(req);

    if (method === 'POST' && path.includes('errors/not-found')) {
      return res.json({ success: true }, 200);
    }

    let payload = {};
    try {
      payload = parsePayload(req);
    } catch (e) {
      return res.json({ success: false, message: 'Invalid JSON body.' }, 400);
    }

    const action = (payload.action || req.query?.action || '').toString().toLowerCase().replace(/-/g, '_');

    if (action === 'ping' || action === 'health') {
      return res.json({ success: true, service: 'stripe-dashboard' }, 200);
    }

    log('stripe-dashboard: unhandled action or path; path=' + path + ' action=' + action);

    return res.json(
      {
        success: false,
        message:
          'stripe-dashboard is not fully implemented. Use action "ping", or use stripe-subscriptions / stripe-products for data.',
      },
      400
    );
  } catch (err) {
    error(err.message || String(err));
    return res.json({ success: false, message: err.message || 'Internal error' }, 500);
  }
};
