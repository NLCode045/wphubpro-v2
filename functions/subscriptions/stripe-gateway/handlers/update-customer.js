const { success, fail } = require('../lib/responses');

/** Billing profile: update Stripe customer contact fields. */
module.exports = async function updateCustomer(ctx) {
  const { stripe, res, error, payload } = ctx;
  const { customerId, name, email, phone, address } = payload;
  if (!customerId) return fail(res, 'customerId required', 400);

  try {
    const params = {};
    if (name !== undefined) params.name = name;
    if (email !== undefined) params.email = email;
    if (phone !== undefined) params.phone = phone;
    if (address && typeof address === 'object') params.address = address;

    const customer = await stripe.customers.update(customerId, params);
    return success(res, { customer });
  } catch (err) {
    error(`updateCustomer: ${err.message}`);
    return fail(res, err.message, 400);
  }
};
