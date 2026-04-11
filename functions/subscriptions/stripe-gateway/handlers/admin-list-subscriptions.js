const { success, fail } = require('../lib/responses');

/**
 * Maps a Stripe Subscription to the admin UI row shape (`AdminSubscriptionRow` in the SPA).
 */
function mapSubscriptionToAdminRow(sub) {
  const item = sub.items?.data?.[0];
  const price = item?.price;
  const product = price?.product;
  const productId = typeof product === 'string' ? product : product?.id ?? null;
  /** Without expanding `price.product`, Stripe returns product id only — use price nickname as label. */
  const planName =
    typeof product === 'object' && product?.name ? product.name : price?.nickname || null;
  const priceId = price?.id ?? null;

  let billingCycle = null;
  let billingIntervalCount = 1;
  if (price?.recurring) {
    billingCycle = price.recurring.interval;
    billingIntervalCount = price.recurring.interval_count ?? 1;
  }

  const customer = sub.customer;
  const customerId = typeof customer === 'string' ? customer : customer?.id ?? null;
  let customerEmail = null;
  let customerName = null;
  if (customer && typeof customer === 'object') {
    customerEmail = customer.email ?? null;
    customerName = customer.name ?? null;
  }

  const metadata = sub.metadata && typeof sub.metadata === 'object' ? sub.metadata : {};
  const userId = metadata.appwrite_user_id ? String(metadata.appwrite_user_id) : null;

  return {
    subscriptionId: sub.id,
    status: sub.status,
    startDate: sub.start_date,
    endDate: sub.ended_at ?? null,
    currentPeriodEnd: sub.current_period_end,
    nextBillingDate: sub.status === 'trialing' && sub.trial_end ? sub.trial_end : sub.current_period_end,
    billingCycle,
    billingIntervalCount,
    planName,
    priceId,
    productId,
    customerId,
    customerEmail,
    customerName,
    cancelAtPeriodEnd: sub.cancel_at_period_end === true,
    hubArchived: false,
    userId,
    username: metadata.username ? String(metadata.username) : null,
  };
}

function subscriptionMatchesProduct(sub, productId) {
  if (!productId) return true;
  for (const it of sub.items?.data || []) {
    const p = it?.price?.product;
    const pid = typeof p === 'string' ? p : p?.id;
    if (pid === productId) return true;
  }
  return false;
}

function subscriptionMatchesSearch(row, sub, searchLower) {
  if (!searchLower) return true;
  const hay = [
    sub.id,
    row.customerEmail,
    row.customerId,
    row.userId,
    row.username,
    row.planName,
    row.priceId,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return hay.includes(searchLower);
}

module.exports = async function adminListSubscriptions(ctx) {
  const { stripe, res, log, error, payload } = ctx;
  const startTime = Date.now();
  log('adminListSubscriptions: START - payload:', JSON.stringify(payload));
  try {
    const limit = Math.min(Number(payload.limit) || 100, 100);
    const maxPages = Math.min(Math.max(Number(payload.maxPages) || 5, 1), 20);
    const searchLower = payload.search ? String(payload.search).toLowerCase().trim() : '';
    const productIdFilter = payload.productId ? String(payload.productId).trim() : '';

    /** Max 4 expand levels on subscription lists; `data.items.data.price.product` exceeds Stripe's limit. */
    const listParams = { limit, expand: ['data.customer', 'data.items.data.price'] };
    if (payload.status) listParams.status = payload.status;
    if (payload.priceId) listParams.price = payload.priceId;

    const rows = [];
    let startingAfter;
    let totalHasMore = false;
    let pagesFetched = 0;

    for (let page = 0; page < maxPages; page += 1) {
      const pageParams = { ...listParams };
      if (startingAfter) pageParams.starting_after = startingAfter;

      log(`adminListSubscriptions: Stripe subscriptions.list page ${page + 1}`, JSON.stringify(pageParams));
      const list = await stripe.subscriptions.list(pageParams);
      pagesFetched = page + 1;

      for (const sub of list.data) {
        if (!subscriptionMatchesProduct(sub, productIdFilter)) continue;
        const row = mapSubscriptionToAdminRow(sub);
        if (!subscriptionMatchesSearch(row, sub, searchLower)) continue;
        rows.push(row);
      }

      totalHasMore = list.has_more;
      if (!list.has_more || list.data.length === 0) break;
      startingAfter = list.data[list.data.length - 1].id;
    }

    log(
      `adminListSubscriptions: SUCCESS - ${rows.length} rows after filters, duration=${Date.now() - startTime}ms`,
    );
    return success(res, {
      subscriptions: rows,
      has_more: totalHasMore,
      fetchedPages: pagesFetched,
    });
  } catch (err) {
    error(`adminListSubscriptions: FAILED after ${Date.now() - startTime}ms - ${err.message}`);
    return fail(res, err.message, 500);
  }
};
