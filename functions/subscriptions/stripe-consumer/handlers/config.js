const { callStripeGateway } = require('../lib/callStripeGateway');

module.exports = async ({ res, log, error }) => {
  try {
    const result = await callStripeGateway('get-publishable-key', {}, log, error);
    if (!result.success) {
      error('stripe-gateway returned error: ' + result.message);
      return res.json({ success: false, message: 'Failed to retrieve Stripe configuration' }, 500);
    }
    return res.json({
      success: true,
      stripe_publishable_key: result.publishable_key,
    });
  } catch (err) {
    error(`stripe config error: ${err.message}`);
    return res.json({ success: false, message: 'Configuration service unavailable' }, 500);
  }
};
