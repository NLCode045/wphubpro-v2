const { success, fail } = require('../lib/responses');

module.exports = async function createProduct(ctx) {
  const { stripe, res, log, error, payload } = ctx;
  const { name, description, metadata } = payload;
  if (!name) return fail(res, 'name required', 400);

  try {
    const product = await stripe.products.create({
      name,
      description: description || '',
      metadata: metadata || {},
    });
    log(`Created Stripe product: ${product.id}`);
    return success(res, { product });
  } catch (err) {
    error(`Failed to create product: ${err.message}`);
    return fail(res, err.message, 400);
  }
};
