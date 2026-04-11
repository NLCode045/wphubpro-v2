const { success, fail } = require('../lib/responses');

module.exports = async function adminUpdateSubscriptionPrice(ctx) {
  const { stripe, res, log, error, payload } = ctx;
  const startTime = Date.now();
  log('adminUpdateSubscriptionPrice: START - payload:', JSON.stringify(payload));
  try {
    const { subscription_id, price_id } = payload;
    if (!subscription_id || !price_id) {
      log('adminUpdateSubscriptionPrice: Missing subscription_id or price_id parameter');
      return fail(res, 'subscription_id and price_id required', 400);
    }

    log(`adminUpdateSubscriptionPrice: Stripe API call - subscriptions.retrieve("${subscription_id}")`);
    const subscription = await stripe.subscriptions.retrieve(subscription_id);
    const itemId = subscription.items.data[0]?.id;
    if (!itemId) {
      log('adminUpdateSubscriptionPrice: No subscription items found');
      return fail(res, 'No subscription items found', 400);
    }

    log(
      `adminUpdateSubscriptionPrice: Stripe API call - subscriptions.update("${subscription_id}", {items:[{id:"${itemId}", price:"${price_id}"}], ...})`,
    );
    const updated = await stripe.subscriptions.update(subscription_id, {
      items: [{ id: itemId, price: price_id }],
      proration_behavior: 'create_prorations',
    });
    log(
      `adminUpdateSubscriptionPrice: SUCCESS - updated subscription "${subscription_id}" price to "${price_id}", duration=${Date.now() - startTime}ms`,
    );
    return success(res, { subscription: updated });
  } catch (err) {
    error(`adminUpdateSubscriptionPrice: FAILED after ${Date.now() - startTime}ms - ${err.message}`);
    return fail(res, err.message, 500);
  }
};
