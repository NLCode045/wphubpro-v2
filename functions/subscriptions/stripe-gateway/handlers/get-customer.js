const { success, fail } = require('../lib/responses');

module.exports = async function getCustomer(ctx) {
  const { stripe, res, payload } = ctx;
  const { customer_id } = payload;
  if (!customer_id) return fail(res, 'customer_id required', 400);

  const customer = await stripe.customers.retrieve(customer_id);
  return success(res, { customer });
};
