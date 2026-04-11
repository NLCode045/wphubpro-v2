const { success, fail } = require('../lib/responses');

module.exports = async function createCustomer(ctx) {
  const { stripe, res, log, payload } = ctx;
  const { email, name, metadata, idempotency_key } = payload;

  try {
    const createParams = {
      email: email || undefined,
      name: name || undefined,
      metadata: metadata || {},
    };
    const requestOpts = idempotency_key ? { idempotencyKey: idempotency_key } : undefined;
    const customer = await stripe.customers.create(createParams, requestOpts);
    log(`Created Stripe customer: ${customer.id}`);
    return success(res, { customer });
  } catch (err) {
    return fail(res, err.message, 400);
  }
};
