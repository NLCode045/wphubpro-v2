const { success, fail } = require('../lib/responses');
const { getProviderCredentials } = require('../lib/vault');

module.exports = async function adminFinanceDashboard(ctx) {
  const { stripe, databases, res, log, error, payload, config } = ctx;
  const startTime = Date.now();
  log('adminFinanceDashboard: START - payload:', JSON.stringify(payload));
  try {
    log('adminFinanceDashboard: Getting Stripe credentials from vault');
    const stripeCredentials = await getProviderCredentials(
      'stripe',
      config.ENCRYPTION_KEY,
      databases,
      config.VAULT_DB_ID,
    );
    if (!stripeCredentials.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY not found');
    log('adminFinanceDashboard: Stripe credentials retrieved');

    const period = payload.period || 'week';
    const now = Math.floor(Date.now() / 1000);
    let windowStart;
    let windowEnd;
    log(`adminFinanceDashboard: Period="${period}"`);

    if (period === 'day') {
      windowStart = now - 7 * 86400;
      windowEnd = now;
    } else if (period === 'month') {
      windowStart = now - 30 * 86400;
      windowEnd = now;
    } else if (period === 'year') {
      windowStart = now - 365 * 86400;
      windowEnd = now;
    } else {
      windowStart = now - 7 * 86400;
      windowEnd = now;
    }
    log(`adminFinanceDashboard: Window: ${windowStart} to ${windowEnd}`);

    log('adminFinanceDashboard: Querying recent paid invoices');
    const recentPaidInvoices = await stripe.invoices.list({ status: 'paid', limit: 20, expand: ['data.customer'] });
    log(`adminFinanceDashboard: Stripe API call - invoices.list() returned ${recentPaidInvoices.data.length} invoices`);
    const recentSubscriptionChanges = [];
    log(`adminFinanceDashboard: Initialized recentSubscriptionChanges array`);

    log(`adminFinanceDashboard: SUCCESS - duration=${Date.now() - startTime}ms`);
    return success(res, {
      success: true,
      period,
      windowStart,
      windowEnd,
      recentPaidInvoices: recentPaidInvoices.data.slice(0, 10).map((inv) => ({
        id: inv.id,
        amount_paid: inv.amount_paid,
        currency: inv.currency,
        created: inv.created,
      })),
      recentSubscriptionChanges,
    });
  } catch (err) {
    error(`adminFinanceDashboard: FAILED after ${Date.now() - startTime}ms - ${err.message}`);
    return fail(res, err.message, 500);
  }
};
