const { success } = require('../lib/responses');

module.exports = async function listInvoices(ctx) {
  const { stripe, res, payload } = ctx;
  const params = { limit: Math.min(payload.limit || 100, 100) };
  if (payload.customer) params.customer = payload.customer;

  const invoices = await stripe.invoices.list(params);
  return success(res, { invoices: invoices.data });
};
