/**
 * Admin billing — placeholder / health for Appwrite execution and HTTP probes.
 * Heavy Stripe admin logic lives in stripe-subscriptions, stripe-invoices, etc.
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

    // Some deploy / runtime checks POST this path; respond so validation does not fail.
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
      return res.json({ success: true, service: 'admin-billing' }, 200);
    }

    log('admin-billing: unhandled action or path; path=' + path + ' action=' + action);

    return res.json(
      {
        success: false,
        message:
          'admin-billing has no handler for this request. Use action "ping", or call stripe-subscriptions / stripe-invoices for billing APIs.',
      },
      400
    );
  } catch (err) {
    error(err.message || String(err));
    return res.json({ success: false, message: err.message || 'Internal error' }, 500);
  }
};
