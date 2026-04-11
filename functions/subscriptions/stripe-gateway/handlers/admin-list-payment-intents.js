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
 * Stripe `paymentIntents.list()` does not support a `status` filter (returns unknown_parameter).
 * When `payload.status` is set, use `paymentIntents.search()`; if Search fails (e.g. region), list + in-memory filter.
 */
module.exports = async function adminListPaymentIntents(ctx) {
  const { stripe, res, log, error, payload } = ctx;
  const startTime = Date.now();
  log('adminListPaymentIntents: START - payload:', JSON.stringify(payload));
  try {
    const limit = Math.min(Number(payload.limit) || 100, 100);
    const customerFilter = payload.customer || payload.customerId || null;
    const statusFilter = payload.status ? String(payload.status).trim() : '';

    let rows;
    let has_more = false;

    const listParams = {
      limit,
      expand: ['data.customer'],
    };
    if (customerFilter) listParams.customer = customerFilter;

    if (statusFilter) {
      const qStatus = statusFilter.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      let query = `status:'${qStatus}'`;
      if (customerFilter) {
        const qCust = String(customerFilter).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        query += ` AND customer:'${qCust}'`;
      }
      try {
        const searchResult = await stripe.paymentIntents.search({
          query,
          limit,
          expand: ['data.customer'],
        });
        rows = searchResult.data;
        has_more = searchResult.has_more;
      } catch (searchErr) {
        log(`adminListPaymentIntents: search failed (${searchErr.message}), using list + filter`);
        const listed = await stripe.paymentIntents.list(listParams);
        rows = listed.data.filter((pi) => pi.status === statusFilter);
        has_more = listed.has_more;
      }
    } else {
      const listed = await stripe.paymentIntents.list(listParams);
      rows = listed.data;
      has_more = listed.has_more;
    }

    const orders = mapPaymentIntentsToOrders(rows);
    log(
      `adminListPaymentIntents: SUCCESS - ${orders.length} rows, duration=${Date.now() - startTime}ms`,
    );
    return success(res, { orders, has_more });
  } catch (err) {
    error(`adminListPaymentIntents: FAILED after ${Date.now() - startTime}ms - ${err.message}`);
    return fail(res, err.message, 500);
  }
};
