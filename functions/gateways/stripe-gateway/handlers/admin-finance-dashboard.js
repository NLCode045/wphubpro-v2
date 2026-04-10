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
    const recentPaidInvoices = await stripe.invoices.list({
      status: 'paid',
      limit: 20,
      expand: ['data.customer', 'data.subscription'],
    });
    log(`adminFinanceDashboard: Stripe API call - invoices.list() returned ${recentPaidInvoices.data.length} invoices`);
    const recentSubscriptionChanges = [];
    log(`adminFinanceDashboard: Initialized recentSubscriptionChanges array`);

    const rangeLabelByPeriod = {
      day: 'Last 7 days',
      week: 'Last 7 days',
      month: 'Last 30 days',
      year: 'Last 365 days',
    };
    const rangeLabel = rangeLabelByPeriod[period] || 'Selected range';

    const mapInvoiceRow = (inv) => {
      const c = inv.customer;
      const customerId = typeof c === 'string' ? c : c?.id ?? null;
      let customerDisplayName = '—';
      if (c && typeof c === 'object') {
        customerDisplayName = c.name || c.email || c.id || '—';
      }
      const sub = inv.subscription;
      const subscriptionId = typeof sub === 'string' ? sub : sub?.id ?? null;
      return {
        id: inv.id,
        number: inv.number ?? null,
        amount_paid: inv.amount_paid,
        currency: inv.currency,
        created: inv.created,
        customerId,
        customerDisplayName,
        subscriptionId,
      };
    };

    /** Full `stats` object expected by the admin finance dashboard UI (charts may be empty until aggregation is implemented). */
    const stats = {
      buckets: [],
      kpis: {
        activeSubscriptionsNow: 0,
        newInPeriod: 0,
        canceledInPeriod: 0,
        revenueInPeriodCents: 0,
        revenueAllTimeCents: 0,
        revenueAllTimeTruncated: true,
        upgradesInPeriod: 0,
        downgradesInPeriod: 0,
      },
      byPlan: [],
      truncated: true,
    };

    log(`adminFinanceDashboard: SUCCESS - duration=${Date.now() - startTime}ms`);
    return success(res, {
      success: true,
      period,
      rangeLabel,
      windowStart,
      windowEnd,
      recentPaidInvoices: recentPaidInvoices.data.slice(0, 10).map(mapInvoiceRow),
      recentSubscriptionChanges,
      stats,
    });
  } catch (err) {
    error(`adminFinanceDashboard: FAILED after ${Date.now() - startTime}ms - ${err.message}`);
    return fail(res, err.message, 500);
  }
};
