const { success, fail } = require('../lib/responses');

module.exports = async function adminGetDetails(ctx) {
  const { stripe, res, log, error, payload } = ctx;
  const startTime = Date.now();
  log('adminGetDetails: START - payload:', JSON.stringify(payload));
  try {
    const { subscription_id } = payload;
    if (!subscription_id) {
      log('adminGetDetails: Missing subscription_id parameter');
      return fail(res, 'subscription_id required', 400);
    }

    log(`adminGetDetails: Stripe API call - subscriptions.retrieve("${subscription_id}", {expand:...})`);
    const subscription = await stripe.subscriptions.retrieve(subscription_id, {
      expand: ['customer', 'items.data.price.product'],
    });
    log(`adminGetDetails: SUCCESS - retrieved subscription "${subscription_id}", duration=${Date.now() - startTime}ms`);
    return success(res, { subscription });
  } catch (err) {
    error(`adminGetDetails: FAILED after ${Date.now() - startTime}ms - ${err.message}`);
    return fail(res, err.message, 500);
  }
};
