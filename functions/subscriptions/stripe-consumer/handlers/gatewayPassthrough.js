const { callStripeGateway } = require('../lib/callStripeGateway');
const { mergeGatewayPayload } = require('../lib/mergeGatewayPayload');

/**
 * Direct stripe-gateway execution (replaces stripe-customers, stripe-payments, and generic passthrough).
 */
module.exports = async ({ req, res, log, error, payload }) => {
  const action = String(payload.action || req.query?.action || '')
    .toLowerCase()
    .trim();
  if (!action) {
    return res.json({ success: false, message: 'action required' }, 400);
  }
  const result = await callStripeGateway(action, mergeGatewayPayload(payload), log, error);
  return res.json(result);
};
