function buildPlanFromProduct(product, pricesData) {
  const metadata = Object.entries(product.metadata || {}).map(([key, value]) => ({
    key,
    value: String(value),
  }));

  const allPrices = pricesData.map((pr) => ({
    id: pr.id,
    amount: pr.unit_amount != null ? pr.unit_amount / 100 : 0,
    currency: pr.currency || 'eur',
    interval: pr.recurring?.interval || 'one_time',
    interval_count: pr.recurring?.interval_count || 1,
  }));

  let monthlyPrice = 0;
  let yearlyPrice = 0;
  let monthlyPriceId = null;
  let yearlyPriceId = null;
  let currency = 'eur';

  for (const pr of pricesData) {
    if (!pr.recurring) continue;
    currency = pr.currency || currency;
    const amount = pr.unit_amount != null ? pr.unit_amount / 100 : 0;
    if (pr.recurring.interval === 'month') {
      monthlyPrice = amount;
      monthlyPriceId = pr.id;
    } else if (pr.recurring.interval === 'year') {
      yearlyPrice = amount;
      yearlyPriceId = pr.id;
    }
  }

  return {
    id: product.id,
    name: product.name,
    description: product.description || '',
    status: product.active ? 'active' : 'inactive',
    monthlyPrice,
    yearlyPrice,
    monthlyPriceId,
    yearlyPriceId,
    currency,
    metadata,
    allPrices,
  };
}

async function countSubscriptionsByProduct(stripe, log) {
  const subIdsByProduct = new Map();
  let subscriptionCountsTruncated = false;
  const statuses = ['active', 'trialing', 'past_due', 'paused'];
  const maxPagesPerStatus = 8;

  for (const status of statuses) {
    let startingAfter;
    for (let page = 0; page < maxPagesPerStatus; page++) {
      const batch = await stripe.subscriptions.list({
        status,
        limit: 100,
        starting_after: startingAfter,
        expand: ['data.items.data.price'],
      });

      for (const sub of batch.data) {
        for (const item of sub.items.data) {
          const price = item.price;
          if (!price) continue;
          const pref = price.product;
          const productId = typeof pref === 'string' ? pref : pref?.id;
          if (!productId) continue;
          if (!subIdsByProduct.has(productId)) subIdsByProduct.set(productId, new Set());
          subIdsByProduct.get(productId).add(sub.id);
        }
      }

      if (!batch.has_more) break;
      if (batch.data.length === 0) break;
      startingAfter = batch.data[batch.data.length - 1].id;
      if (page === maxPagesPerStatus - 1 && batch.has_more) {
        subscriptionCountsTruncated = true;
      }
    }
  }

  const counts = {};
  for (const [productId, set] of subIdsByProduct.entries()) {
    counts[productId] = set.size;
  }
  return { counts, subscriptionCountsTruncated };
}

module.exports = { buildPlanFromProduct, countSubscriptionsByProduct };
