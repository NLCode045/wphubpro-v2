const { success, fail } = require('../lib/responses');

module.exports = async function getPrice(ctx) {
  const { stripe, res, error, payload } = ctx;
  const { priceId } = payload;
  if (!priceId) return fail(res, 'priceId required', 400);

  try {
    const price = await stripe.prices.retrieve(priceId);
    return success(res, { price });
  } catch (err) {
    error(`Failed to retrieve price: ${err.message}`);
    return fail(res, err.message, 400);
  }
};
