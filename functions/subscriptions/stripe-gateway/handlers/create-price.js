const { success, fail } = require('../lib/responses');

module.exports = async function createPrice(ctx) {
  const { stripe, res, log, payload } = ctx;
  const { product_id, amount, currency, interval } = payload;
  if (!product_id || !amount) return fail(res, 'product_id and amount required', 400);

  try {
    const price = await stripe.prices.create({
      product: product_id,
      unit_amount: Math.round(parseFloat(amount) * 100),
      currency: currency || 'usd',
      recurring: interval ? { interval, interval_count: 1 } : undefined,
    });
    log(`Created Stripe price: ${price.id}`);
    return success(res, { price });
  } catch (err) {
    return fail(res, err.message, 400);
  }
};
