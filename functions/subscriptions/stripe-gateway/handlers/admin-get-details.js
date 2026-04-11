const { success, fail } = require('../lib/responses');
const buildSubscriptionDetailsPayload = require('./lib/subscriptionDetailsMember');

/**
 * Admin subscription detail — same JSON shape as member-subscription-details (customer, plan, invoices).
 * Accepts `subscription_id` or `subscriptionId` (consumer / Appwrite clients often send camelCase).
 */
module.exports = async function adminGetDetails(ctx) {
  const { stripe, res, log, error, payload } = ctx;
  const startTime = Date.now();
  const subscriptionId = payload.subscription_id || payload.subscriptionId;
  log('adminGetDetails: START - subscriptionId:', subscriptionId);
  try {
    if (!subscriptionId) {
      return fail(res, 'subscription_id required', 400);
    }

    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: [
        'latest_invoice',
        'customer',
        'default_payment_method',
        'schedule',
        'items.data.price.product',
      ],
    });

    const body = await buildSubscriptionDetailsPayload(stripe, subscription, log);
    log(`adminGetDetails: SUCCESS duration=${Date.now() - startTime}ms`);
    return success(res, body);
  } catch (err) {
    error(`adminGetDetails: FAILED after ${Date.now() - startTime}ms - ${err.message}`);
    return fail(res, err.message, 500);
  }
};
