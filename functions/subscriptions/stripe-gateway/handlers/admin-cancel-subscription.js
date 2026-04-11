const { success, fail } = require('../lib/responses');

module.exports = async function adminCancelSubscription(ctx) {
  const { stripe, res, log, error, payload } = ctx;
  const startTime = Date.now();
  log('adminCancelSubscription: START - payload:', JSON.stringify(payload));
  try {
    const { subscription_id } = payload;
    if (!subscription_id) {
      log('adminCancelSubscription: Missing subscription_id parameter');
      return fail(res, 'subscription_id required', 400);
    }

    log(`adminCancelSubscription: Stripe API call - subscriptions.del("${subscription_id}")`);
    const subscription = await stripe.subscriptions.del(subscription_id);
    log(`adminCancelSubscription: SUCCESS - cancelled subscription "${subscription_id}", duration=${Date.now() - startTime}ms`);
    return success(res, { subscription });
  } catch (err) {
    error(`adminCancelSubscription: FAILED after ${Date.now() - startTime}ms - ${err.message}`);
    return fail(res, err.message, 500);
  }
};
