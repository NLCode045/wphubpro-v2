const { success, fail } = require('../lib/responses');

module.exports = async function adminPauseSubscription(ctx) {
  const { stripe, res, log, error, payload } = ctx;
  const startTime = Date.now();
  log('adminPauseSubscription: START - payload:', JSON.stringify(payload));
  try {
    const { subscription_id } = payload;
    if (!subscription_id) {
      log('adminPauseSubscription: Missing subscription_id parameter');
      return fail(res, 'subscription_id required', 400);
    }

    log(`adminPauseSubscription: Stripe API call - subscriptions.update("${subscription_id}", {pause_collection:...})`);
    const subscription = await stripe.subscriptions.update(subscription_id, {
      pause_collection: { behavior: 'mark_uncollectible' },
    });
    log(`adminPauseSubscription: SUCCESS - paused subscription "${subscription_id}", duration=${Date.now() - startTime}ms`);
    return success(res, { subscription });
  } catch (err) {
    error(`adminPauseSubscription: FAILED after ${Date.now() - startTime}ms - ${err.message}`);
    return fail(res, err.message, 500);
  }
};
