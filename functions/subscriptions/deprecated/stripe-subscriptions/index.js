/**
 * stripe-subscriptions: Subscription operations — composite handlers + stripe-gateway passthrough
 *
 * Domain actions (Appwrite + Stripe composition) run in ./handlers.
 * Any other action is forwarded to stripe-gateway (vault credentials).
 */
const { callStripeGateway } = require('./lib/callStripeGateway');

const LOCAL_HANDLERS = {
  get: require('./handlers/get'),
  cancel: require('./handlers/cancel'),
  'get-details': require('./handlers/get-details'),
  'preview-proration': require('./handlers/preview-proration'),
  'cancel-schedule-update': require('./handlers/cancel-schedule-update'),
};

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

module.exports = async ({ req, res, log, error }) => {
  try {
    const payload = parsePayload(req);
    const action = String(payload.action || req.query?.action || '')
      .toLowerCase()
      .trim();

    if (!action) {
      return res.json({ success: false, message: 'action required' }, 400);
    }

    const local = LOCAL_HANDLERS[action];
    if (local) {
      return local({ req, res, log, error, payload });
    }

    if (action === 'admin-finance-dashboard-details') {
      return res.json(
        {
          success: false,
          message:
            'Action admin-finance-dashboard-details is not implemented. Use admin-finance-dashboard or add a handler.',
        },
        501
      );
    }

    const result = await callStripeGateway(action, payload.payload || payload, log, error);
    return res.json(result);
  } catch (err) {
    error(`stripe-subscriptions error: ${err.message}`);
    return res.json({ success: false, message: err.message }, 500);
  }
};
