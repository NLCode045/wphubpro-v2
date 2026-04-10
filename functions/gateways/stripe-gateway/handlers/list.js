const { success, fail } = require('../lib/responses');
const { buildPlanFromProduct, countSubscriptionsByProduct } = require('./lib/planCatalog');

/** WPHub admin + billing: catalog shaped as StripePlan[] (see stripe-products consumer / frontend). */
module.exports = async function listPlansCatalog(ctx) {
  const { stripe, res, log, error, payload } = ctx;
  try {
    const body =
      payload.payload && typeof payload.payload === 'object' && !Array.isArray(payload.payload)
        ? { ...payload, ...payload.payload }
        : payload;
    const activeOnly = body.active_only === true;
    const excludeHidden = body.exclude_hidden === true;
    const excludeNonSellable = body.exclude_non_sellable === true;
    const includeCounts = body.include_active_subscription_counts === true;

    let subCounts = null;
    let subscriptionCountsTruncated = false;
    if (includeCounts) {
      const counted = await countSubscriptionsByProduct(stripe, log);
      subCounts = counted.counts;
      subscriptionCountsTruncated = counted.subscriptionCountsTruncated;
    }

    const plans = [];
    let hasMore = true;
    let startingAfter;
    const maxProductPages = 10;

    for (let pPage = 0; pPage < maxProductPages && hasMore; pPage++) {
      const params = { limit: 100 };
      if (activeOnly) params.active = true;
      if (startingAfter) params.starting_after = startingAfter;

      const batch = await stripe.products.list(params);

      for (const product of batch.data) {
        if (excludeHidden && product.metadata?.hidden === 'true') continue;
        if (excludeNonSellable && product.metadata?.non_sellable === 'true') continue;

        const priceList = await stripe.prices.list({ product: product.id, limit: 100 });
        const row = buildPlanFromProduct(product, priceList.data);
        if (includeCounts) {
          row.activeSubscriptionsCount = subCounts ? subCounts[product.id] ?? 0 : 0;
        }
        plans.push(row);
      }

      hasMore = batch.has_more;
      if (batch.data.length > 0) {
        startingAfter = batch.data[batch.data.length - 1].id;
      } else {
        hasMore = false;
      }
    }

    return success(res, { plans, subscriptionCountsTruncated });
  } catch (err) {
    error(`listPlansCatalog: ${err.message}`);
    return fail(res, err.message, 500);
  }
};
