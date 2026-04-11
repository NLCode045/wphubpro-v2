const { success } = require('../lib/responses');

module.exports = async function listCustomers(ctx) {
  const { stripe, res, payload } = ctx;
  const params = { limit: Math.min(payload.limit || 100, 100) };
  const customers = await stripe.customers.list(params);
  return success(res, { customers: customers.data });
};
