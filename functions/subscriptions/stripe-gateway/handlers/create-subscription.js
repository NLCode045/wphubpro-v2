const { success, fail } = require('../lib/responses');

module.exports = async function createSubscription(ctx) {
  const { stripe, res, error, payload } = ctx;
  try {
    const { customer, items, metadata, ...rest } = payload;
    if (!customer || !items) return fail(res, 'customer and items required', 400);
    const sub = await stripe.subscriptions.create({
      customer,
      items,
      metadata: metadata || {},
      ...rest,
    });
    return success(res, { subscription: sub });
  } catch (err) {
    error(`createSubscription: ${err.message}`);
    return fail(res, err.message, 400);
  }
};
