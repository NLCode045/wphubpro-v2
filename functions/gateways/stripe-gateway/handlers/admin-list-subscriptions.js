const { success, fail } = require('../lib/responses');
const { getProviderCredentials } = require('../lib/vault');

module.exports = async function adminListSubscriptions(ctx) {
  const { stripe, databases, res, log, error, payload, config } = ctx;
  const startTime = Date.now();
  log('adminListSubscriptions: START - payload:', JSON.stringify(payload));
  try {
    log('adminListSubscriptions: Getting Stripe credentials from vault');
    const stripeCredentials = await getProviderCredentials(
      'stripe',
      config.ENCRYPTION_KEY,
      databases,
      config.VAULT_DB_ID,
    );
    if (!stripeCredentials.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY not found');
    log('adminListSubscriptions: Stripe credentials retrieved');

    const params = { limit: Math.min(payload.limit || 100, 100) };
    if (payload.status) params.status = payload.status;
    if (payload.priceId) {
      params.price = payload.priceId;
    }
    log(`adminListSubscriptions: Calling Stripe API with params:`, JSON.stringify(params));

    const subscriptions = await stripe.subscriptions.list(params);
    log(
      `adminListSubscriptions: SUCCESS - received ${subscriptions.data.length} subscriptions, has_more=${subscriptions.has_more}, duration=${Date.now() - startTime}ms`,
    );
    return success(res, { subscriptions: subscriptions.data, has_more: subscriptions.has_more });
  } catch (err) {
    error(`adminListSubscriptions: FAILED after ${Date.now() - startTime}ms - ${err.message}`);
    return fail(res, err.message, 500);
  }
};
