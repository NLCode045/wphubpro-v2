const { success, fail } = require('../lib/responses');
const { buildPlanFromProduct } = require('./lib/planCatalog');

/**
 * Admin plan detail: `action: 'get'` + `productId` (SPA `useAdminPlanDetail`).
 * Returns `{ plan, stats, subscribers }` — not the raw `get-product` shape.
 */
module.exports = async function getPlanAdmin(ctx) {
  const { stripe, res, error, payload } = ctx;
  try {
    const productId = payload.product_id || payload.productId;
    if (!productId) return fail(res, 'product_id required', 400);

    const product = await stripe.products.retrieve(productId);
    const priceList = await stripe.prices.list({ product: productId, limit: 100 });
    const planBase = buildPlanFromProduct(product, priceList.data);
    const stripeLink = `https://dashboard.stripe.com/products/${encodeURIComponent(product.id)}`;
    const plan = { ...planBase, stripeLink };

    const statuses = ['active', 'trialing', 'past_due', 'paused'];
    const subscribers = [];
    let subscriptionsMonthly = 0;
    let subscriptionsYearly = 0;
    let totalEarningsCents = 0;

    for (const status of statuses) {
      let startingAfter;
      for (let page = 0; page < 15; page += 1) {
        const batch = await stripe.subscriptions.list({
          status,
          limit: 100,
          starting_after: startingAfter,
          expand: ['data.customer', 'data.items.data.price'],
        });

        for (const sub of batch.data) {
          let matchInterval = null;
          let matchAmountCents = 0;

          for (const item of sub.items?.data || []) {
            const pr = item.price;
            if (!pr) continue;
            const pref = pr.product;
            const pid = typeof pref === 'string' ? pref : pref?.id;
            if (pid !== productId) continue;
            if (pr.recurring?.interval === 'year') matchInterval = 'year';
            else if (pr.recurring?.interval === 'month') matchInterval = 'month';
            if (item.price?.unit_amount != null) {
              matchAmountCents = item.price.unit_amount;
            }
            break;
          }

          if (matchInterval == null) continue;

          if (matchInterval === 'year') subscriptionsYearly += 1;
          else subscriptionsMonthly += 1;

          totalEarningsCents += matchAmountCents;

          const cust = sub.customer;
          const customerId = typeof cust === 'string' ? cust : cust?.id ?? '';
          const email = typeof cust === 'object' && cust ? cust.email || '' : '';
          const name = typeof cust === 'object' && cust ? cust.name || '' : '';
          const userId = sub.metadata?.appwrite_user_id ? String(sub.metadata.appwrite_user_id) : null;

          subscribers.push({
            subscriptionId: sub.id,
            customerId,
            email,
            name,
            billingInterval: matchInterval,
            subscribedSince: sub.start_date,
            status: sub.status,
            userId,
          });
        }

        if (!batch.has_more || batch.data.length === 0) break;
        startingAfter = batch.data[batch.data.length - 1].id;
      }
    }

    const stats = {
      totalSubscriptions: subscribers.length,
      subscriptionsMonthly,
      subscriptionsYearly,
      totalEarnings: Math.round((totalEarningsCents / 100) * 100) / 100,
      upgradedTo: 0,
      downgradedTo: 0,
      downgradedFrom: 0,
    };

    return success(res, { plan, stats, subscribers });
  } catch (err) {
    error(`getPlanAdmin: ${err.message}`);
    return fail(res, err.message, 500);
  }
};
