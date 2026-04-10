const { success, fail } = require('../lib/responses');

module.exports = async function updateSubscription(ctx) {
  const { stripe, res, error, payload } = ctx;
  try {
    const { subscription_id, subscriptionId, ...updates } = payload;
    const id = subscription_id || subscriptionId;
    if (!id) return fail(res, 'subscription_id required', 400);
    const subscription = await stripe.subscriptions.update(id, updates);
    return success(res, { subscription });
  } catch (err) {
    error(`updateSubscription: ${err.message}`);
    return fail(res, err.message, 400);
  }
};
