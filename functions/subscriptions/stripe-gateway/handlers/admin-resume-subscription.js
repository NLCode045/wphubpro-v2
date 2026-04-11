const { success, fail } = require('../lib/responses');

module.exports = async function adminResumeSubscription(ctx) {
  const { stripe, res, log, error, payload } = ctx;
  const startTime = Date.now();
  log('adminResumeSubscription: START - payload:', JSON.stringify(payload));
  try {
    const { subscription_id } = payload;
    if (!subscription_id) {
      log('adminResumeSubscription: Missing subscription_id parameter');
      return fail(res, 'subscription_id required', 400);
    }

    log(`adminResumeSubscription: Stripe API call - subscriptions.update("${subscription_id}", {pause_collection:{}})`);
    const subscription = await stripe.subscriptions.update(subscription_id, { pause_collection: {} });
    log(`adminResumeSubscription: SUCCESS - resumed subscription "${subscription_id}", duration=${Date.now() - startTime}ms`);
    return success(res, { subscription });
  } catch (err) {
    error(`adminResumeSubscription: FAILED after ${Date.now() - startTime}ms - ${err.message}`);
    return fail(res, err.message, 500);
  }
};
