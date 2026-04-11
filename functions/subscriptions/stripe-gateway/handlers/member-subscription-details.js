const { success, fail } = require('../lib/responses');
const buildSubscriptionDetailsPayload = require('./lib/subscriptionDetailsMember');

module.exports = async function memberSubscriptionDetails(ctx) {
  const { stripe, res, error, payload, log } = ctx;
  const subscriptionId = payload.subscription_id || payload.subscriptionId;
  if (!subscriptionId) return fail(res, 'subscription_id required', 400);

  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['latest_invoice', 'customer', 'default_payment_method', 'schedule'],
    });
    const body = await buildSubscriptionDetailsPayload(stripe, subscription, log);
    return success(res, body);
  } catch (err) {
    error(`memberSubscriptionDetails: ${err.message}`);
    return fail(res, err.message, 400);
  }
};
