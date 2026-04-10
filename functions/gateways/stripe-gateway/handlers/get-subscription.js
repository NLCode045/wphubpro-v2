const { success, fail } = require('../lib/responses');

module.exports = async function getSubscription(ctx) {
  const { stripe, res, error, payload } = ctx;
  const id = payload.subscriptionId || payload.subscription_id;
  if (!id) return fail(res, 'subscriptionId required', 400);

  try {
    const opts = Array.isArray(payload.expand) && payload.expand.length ? { expand: payload.expand } : {};
    const subscription = await stripe.subscriptions.retrieve(id, opts);
    return success(res, { subscription });
  } catch (err) {
    error(`Failed to retrieve subscription: ${err.message}`);
    return fail(res, err.message, 400);
  }
};
