const { success, fail } = require('../lib/responses');

module.exports = async function getInvoice(ctx) {
  const { stripe, res, payload } = ctx;
  const { invoice_id } = payload;
  if (!invoice_id) return fail(res, 'invoice_id required', 400);

  const invoice = await stripe.invoices.retrieve(invoice_id);
  return success(res, { invoice });
};
