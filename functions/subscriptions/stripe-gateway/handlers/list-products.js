const { success } = require('../lib/responses');

module.exports = async function listProducts(ctx) {
  const { stripe, res, payload } = ctx;
  const params = { limit: Math.min(payload.limit || 100, 100) };
  if (payload.active !== undefined) params.active = payload.active === true;

  const products = await stripe.products.list(params);
  return success(res, { products: products.data });
};
