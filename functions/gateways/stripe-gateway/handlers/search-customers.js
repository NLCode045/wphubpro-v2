const { success, fail } = require('../lib/responses');

module.exports = async function searchCustomers(ctx) {
  const { stripe, res, error, payload } = ctx;
  try {
    const { query, limit } = payload;
    if (!query) return fail(res, 'query required', 400);
    const result = await stripe.customers.search({
      query,
      limit: Math.min(Number(limit) || 1, 10),
    });
    return success(res, { customers: result.data });
  } catch (err) {
    error(`searchCustomers: ${err.message}`);
    return fail(res, err.message, 400);
  }
};
