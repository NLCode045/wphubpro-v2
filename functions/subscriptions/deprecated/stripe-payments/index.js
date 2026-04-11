/**
 * stripe-payments: Consumer function for Stripe payment operations
 * Routes to stripe-gateway via Appwrite Functions SDK
 *
 * Pure data flow - no credentials, no vault access
 */
const { callStripeGateway } = require('./lib/callStripeGateway');

function parsePayload(req) {
  if (!req) return {};
  if (req.body && typeof req.body === 'object') return req.body;
  if (req.bodyRaw && typeof req.bodyRaw === 'string') {
    try { return JSON.parse(req.bodyRaw); } catch { return {}; }
  }
  if (req.payload && typeof req.payload === 'string') {
    try { return JSON.parse(req.payload); } catch { return {}; }
  }
  if (req.payload && typeof req.payload === 'object') return req.payload;
  return {};
}

module.exports = async ({ req, res, log, error }) => {
  try {
    const payload = parsePayload(req);
    const action = String(payload.action || req.query?.action || '').toLowerCase().trim();

    if (!action) {
      return res.json({ success: false, message: 'action required' }, 400);
    }

    const result = await callStripeGateway(action, payload.payload || payload, log, error);
    return res.json(result);
  } catch (err) {
    error(`stripe-payments error: ${err.message}`);
    return res.json({ success: false, message: err.message }, 500);
  }
};
