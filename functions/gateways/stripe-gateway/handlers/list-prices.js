const { success } = require('../lib/responses');

module.exports = async function listPrices(ctx) {
  const { stripe, res, payload } = ctx;
  const params = { limit: Math.min(payload.limit || 100, 100) };
  if (payload.product) params.product = payload.product;
  if (payload.active !== undefined) params.active = payload.active === true;

  const prices = await stripe.prices.list(params);
  return success(res, { prices: prices.data });
};
