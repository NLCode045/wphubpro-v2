const { success, fail } = require('../lib/responses');

module.exports = async function adminGetPaymentIntent(ctx) {
  const { stripe, res, log, error, payload } = ctx;
  const startTime = Date.now();
  log('adminGetPaymentIntent: START - payload:', JSON.stringify(payload));
  try {
    const paymentIntentId = payload.payment_intent_id || payload.paymentIntentId;
    if (!paymentIntentId) {
      log('adminGetPaymentIntent: Missing payment_intent_id / paymentIntentId parameter');
      return fail(res, 'payment_intent_id required', 400);
    }

    log(`adminGetPaymentIntent: Stripe API call - paymentIntents.retrieve("${paymentIntentId}")`);
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ['customer', 'latest_charge'],
    });
    const latest = paymentIntent.latest_charge;
    const charge = typeof latest === 'object' && latest != null ? latest : null;
    log(
      `adminGetPaymentIntent: SUCCESS - retrieved payment intent "${paymentIntentId}", duration=${Date.now() - startTime}ms`,
    );
    return success(res, { paymentIntent, charge });
  } catch (err) {
    error(`adminGetPaymentIntent: FAILED after ${Date.now() - startTime}ms - ${err.message}`);
    return fail(res, err.message, 500);
  }
};
