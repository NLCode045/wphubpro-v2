const { success, fail } = require('../lib/responses');

module.exports = async function getProduct(ctx) {
  const { stripe, res, payload } = ctx;
  const product_id = payload.product_id || payload.productId;
  if (!product_id) return fail(res, 'product_id required', 400);

  const product = await stripe.products.retrieve(product_id);
  return success(res, { product });
};
