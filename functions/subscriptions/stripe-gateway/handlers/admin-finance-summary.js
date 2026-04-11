const { success, fail } = require('../lib/responses');

module.exports = async function adminFinanceSummary(ctx) {
  const { stripe, res, log, error, payload } = ctx;
  const startTime = Date.now();
  log('adminFinanceSummary: START');
  try {
    const statusCounts = { active: 0, trialing: 0, past_due: 0, canceled: 0, unpaid: 0, paused: 0, incomplete: 0 };
    log('adminFinanceSummary: Counting subscriptions by status');

    for (const status of Object.keys(statusCounts)) {
      log(`adminFinanceSummary: Querying status="${status}"`);
      let total = 0;
      let startingAfter = null;
      for (let page = 0; page < 5; page++) {
        const params = { status, limit: 100 };
        if (startingAfter) params.starting_after = startingAfter;
        log(`adminFinanceSummary: Stripe API call - subscriptions.list({status:"${status}", page:${page}, limit:100})`);
        const batch = await stripe.subscriptions.list(params);
        log(`adminFinanceSummary: Received ${batch.data.length} items for status="${status}", page=${page}`);
        total += batch.data.length;
        if (!batch.has_more || !batch.data.length) break;
        startingAfter = batch.data[batch.data.length - 1].id;
      }
      statusCounts[status] = total;
      log(`adminFinanceSummary: Status "${status}" total count: ${total}`);
    }

    log('adminFinanceSummary: Computing MRR from active subscriptions');
    let mrrCents = 0;
    let startingAfter = null;
    for (let page = 0; page < 5; page++) {
      const params = { status: 'active', limit: 100, expand: ['data.items.data.price'] };
      if (startingAfter) params.starting_after = startingAfter;
      log(`adminFinanceSummary: Stripe API call - subscriptions.list({status:"active", page:${page}, expand:...})`);
      const batch = await stripe.subscriptions.list(params);
      log(`adminFinanceSummary: Received ${batch.data.length} active subscriptions for MRR calculation, page=${page}`);
      for (const sub of batch.data) {
        const item = sub.items?.data?.[0];
        const price = item?.price;
        if (price?.unit_amount != null && price.recurring) {
          const ic = price.recurring.interval_count || 1;
          let monthlyAmount = price.unit_amount * (item.quantity || 1);
          if (price.recurring.interval === 'year') monthlyAmount /= 12 * ic;
          else if (price.recurring.interval === 'week') monthlyAmount *= 52 / (12 * ic);
          else if (price.recurring.interval === 'day') monthlyAmount *= 30 / ic;
          else monthlyAmount /= ic;
          mrrCents += monthlyAmount;
        }
      }
      if (!batch.has_more || !batch.data.length) break;
      startingAfter = batch.data[batch.data.length - 1].id;
    }
    log(`adminFinanceSummary: Computed MRR: ${Math.round(mrrCents)} cents`);

    log('adminFinanceSummary: Querying failed payment intents');
    const failedPi = await stripe.paymentIntents.list({
      limit: 20,
      created: { gte: Math.floor(Date.now() / 1000) - 7 * 24 * 3600 },
    });
    log(`adminFinanceSummary: Stripe API call - paymentIntents.list() returned ${failedPi.data.length} intents`);
    const recentFailedPayments = failedPi.data.filter((pi) =>
      ['requires_payment_method', 'canceled'].includes(pi.status),
    ).length;
    log(`adminFinanceSummary: Found ${recentFailedPayments} failed payments in last 7 days`);

    log('adminFinanceSummary: Querying paid invoices');
    const paidInvoices = await stripe.invoices.list({ limit: 30, status: 'paid' });
    log(`adminFinanceSummary: Stripe API call - invoices.list() returned ${paidInvoices.data.length} paid invoices`);
    const revenueLastInvoicesCents = paidInvoices.data.reduce((sum, inv) => sum + (inv.amount_paid || 0), 0);
    log(`adminFinanceSummary: Total revenue from last 30 paid invoices: ${revenueLastInvoicesCents} cents`);

    log(`adminFinanceSummary: SUCCESS - duration=${Date.now() - startTime}ms`);
    return success(res, {
      subscriptionCountsByStatus: statusCounts,
      approximateMrrCents: Math.round(mrrCents),
      approximateMrr: Math.round(mrrCents) / 100,
      recentFailedPaymentIntents7d: recentFailedPayments,
      revenueFromLast30PaidInvoicesCents: revenueLastInvoicesCents,
    });
  } catch (err) {
    error(`adminFinanceSummary: FAILED after ${Date.now() - startTime}ms - ${err.message}`);
    return fail(res, err.message, 500);
  }
};
