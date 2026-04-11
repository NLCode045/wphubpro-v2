const { success, fail } = require('../lib/responses');

/** Rows for admin UI (`useAdminPaymentsList` expects `orders`, not raw Stripe objects). */
function mapPaymentIntentsToOrders(paymentIntentsData) {
  return paymentIntentsData.map((pi) => {
    const cust = pi.customer;
    const customer = typeof cust === 'string' ? cust : cust?.id ?? null;
    const email =
      pi.receipt_email ||
      (typeof cust === 'object' && cust && cust.email ? cust.email : null) ||
      null;
    return {
      id: pi.id,
      amount: pi.amount,
      currency: pi.currency,
      status: pi.status,
      customer,
      email,
      date: pi.created,
      description: pi.description ?? null,
      invoice: null,
    };
  });
}

/**
 * `paymentIntents.list()` does not accept `status` (Stripe: "Received unknown parameter: status").
 * `paymentIntents.search` is not available in all regions / API versions.
 * Always list, then optionally filter by `payload.status` in memory (first `limit` rows only).
 */
module.exports = async function adminListPaymentIntents(ctx) {
  const { stripe, res, log, error, payload } = ctx;
  const startTime = Date.now();
  log('adminListPaymentIntents: START - payload:', JSON.stringify(payload));
  try {
    const limit = Math.min(Number(payload.limit) || 100, 100);
    const customerFilter = payload.customer || payload.customerId || null;
    const statusFilter = payload.status ? String(payload.status).trim() : '';

    const listParams = {
      limit,
      expand: ['data.customer'],
    };
    if (customerFilter) listParams.customer = customerFilter;

    const listed = await stripe.paymentIntents.list(listParams);
    let rows = listed.data;
    if (statusFilter) {
      rows = rows.filter((pi) => pi.status === statusFilter);
    }
    const has_more = listed.has_more;

    const orders = mapPaymentIntentsToOrders(rows);
    log(
      `adminListPaymentIntents: SUCCESS - ${orders.length} rows (statusFilter=${statusFilter || 'none'}), duration=${Date.now() - startTime}ms`,
    );
    return success(res, { orders, has_more });
  } catch (err) {
    error(`adminListPaymentIntents: FAILED after ${Date.now() - startTime}ms - ${err.message}`);
    return fail(res, err.message, 500);
  }
};
