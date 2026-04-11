/**
 * Unified Stripe consumer: routes to ./handlers/* (replaces separate stripe-* Appwrite functions).
 */
const { parsePayload, stripRoutingMeta } = require('./lib/parsePayload');
const { resolveRoute } = require('./lib/resolveRoute');

const handlers = {
  webhook: require('./handlers/webhook'),
  config: require('./handlers/config'),
  'portal-link': require('./handlers/portal-link'),
  'order-payments': require('./handlers/order-payments'),
  'payment-methods': require('./handlers/payment-methods'),
  'create-customer': require('./handlers/create-customer'),
  products: require('./handlers/products'),
  invoices: require('./handlers/invoices'),
  subscriptions: require('./handlers/subscriptions/dispatch'),
  gateway: require('./handlers/gatewayPassthrough'),
};

module.exports = async (ctx) => {
  const { req, res, log, error } = ctx;
  try {
    const raw = parsePayload(req);
    const payload = stripRoutingMeta(raw);
    const route = resolveRoute(req, raw);
    const handler = handlers[route];
    if (!handler) {
      error(`stripe-consumer: unknown route "${route}"`);
      return res.json({ success: false, message: 'Internal routing error' }, 500);
    }
    return handler({ req, res, log, error, payload });
  } catch (err) {
    error(`stripe-consumer error: ${err.message}`);
    return res.json({ success: false, message: err.message }, 500);
  }
};
