const { success, fail } = require('../lib/responses');

module.exports = async function adminArchiveSubscription(ctx) {
  const { stripe, res, log, error, payload } = ctx;
  const startTime = Date.now();
  log('adminArchiveSubscription: START - payload:', JSON.stringify(payload));
  try {
    const { subscription_id, archive_reason } = payload;
    if (!subscription_id) {
      log('adminArchiveSubscription: Missing subscription_id parameter');
      return fail(res, 'subscription_id required', 400);
    }

    const metadata = {
      archived: 'true',
      archived_at: new Date().toISOString(),
      archived_reason: archive_reason || 'admin_request',
    };
    log(`adminArchiveSubscription: Stripe API call - subscriptions.update("${subscription_id}", {metadata:...})`);
    const subscription = await stripe.subscriptions.update(subscription_id, { metadata });
    log(`adminArchiveSubscription: SUCCESS - archived subscription "${subscription_id}", duration=${Date.now() - startTime}ms`);
    return success(res, { subscription });
  } catch (err) {
    error(`adminArchiveSubscription: FAILED after ${Date.now() - startTime}ms - ${err.message}`);
    return fail(res, err.message, 500);
  }
};
