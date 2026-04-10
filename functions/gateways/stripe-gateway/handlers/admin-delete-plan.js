const { success, fail } = require('../lib/responses');

async function listPriceIdsForProduct(stripe, productId) {
  const [activePricesRes, inactivePricesRes] = await Promise.all([
    stripe.prices.list({ product: productId, limit: 100, active: true }),
    stripe.prices.list({ product: productId, limit: 100, active: false }),
  ]);
  const seen = new Set();
  const ids = [];
  for (const p of [...activePricesRes.data, ...inactivePricesRes.data]) {
    if (p.id && !seen.has(p.id)) {
      seen.add(p.id);
      ids.push(p.id);
    }
  }
  return ids;
}

const MIGRATABLE = new Set(['active', 'trialing', 'past_due', 'paused']);

async function listSubscriptionsForProductPrices(stripe, priceIds) {
  const subs = [];
  const seenSub = new Set();
  for (const priceId of priceIds) {
    let hasMore = true;
    let startingAfter = null;
    while (hasMore) {
      const params = { price: priceId, status: 'all', limit: 100 };
      if (startingAfter) params.starting_after = startingAfter;
      const page = await stripe.subscriptions.list(params);
      for (const sub of page.data) {
        if (!MIGRATABLE.has(sub.status)) continue;
        if (seenSub.has(sub.id)) continue;
        seenSub.add(sub.id);
        subs.push(sub);
      }
      hasMore = page.has_more;
      if (page.data.length) startingAfter = page.data[page.data.length - 1].id;
    }
  }
  return subs;
}

module.exports = async function adminDeletePlan(ctx) {
  const { stripe, res, log, error } = ctx;
  const payload = ctx.payload || {};

  const productId = payload.product_id || payload.productId;
  const migrateSubscribers =
    payload.migrateSubscribers === true ||
    payload.migrateSubscribers === 'true' ||
    payload.migrate_subscribers === true ||
    payload.migrate_subscribers === 'true';
  const targetPriceId = payload.targetPriceId || payload.target_price_id;

  if (!productId) {
    return fail(res, 'productId is required', 400);
  }

  try {
    const priceIds = await listPriceIdsForProduct(stripe, productId);
    const activeSubs = await listSubscriptionsForProductPrices(stripe, priceIds);

    if (activeSubs.length > 0 && !migrateSubscribers) {
      await stripe.products.update(productId, { active: false });
      for (const pid of priceIds) {
        try {
          await stripe.prices.update(pid, { active: false });
        } catch (e) {
          log('deactivate price skip ' + pid + ': ' + e.message);
        }
      }
      const product = await stripe.products.retrieve(productId);
      const metadata = { ...(product.metadata || {}), hidden: 'true', non_sellable: 'true' };
      await stripe.products.update(productId, { metadata });

      log('admin-delete-plan retire_only ' + productId + ' subs=' + activeSubs.length);
      return success(res, {
        mode: 'retired',
        message:
          'Plan archived and hidden. Existing subscriptions stay on this plan until customers change plan in their profile or you migrate them from another admin action.',
        migratedCount: 0,
        failedMigrations: [],
        subscriptionCount: activeSubs.length,
      });
    }

    if (activeSubs.length > 0 && migrateSubscribers) {
      if (!targetPriceId || typeof targetPriceId !== 'string') {
        return fail(res, 'targetPriceId is required when migrating subscribers off this plan.', 400);
      }

      const newPrice = await stripe.prices.retrieve(targetPriceId);
      const newProductId =
        typeof newPrice.product === 'string' ? newPrice.product : newPrice.product?.id;
      if (newProductId === productId) {
        return fail(res, 'targetPriceId must belong to a different product.', 400);
      }

      const failedMigrations = [];
      let migratedCount = 0;
      const proration =
        payload.proration_behavior === 'none' || payload.prorationBehavior === 'none'
          ? 'none'
          : 'always_invoice';

      for (const sub of activeSubs) {
        try {
          const full = await stripe.subscriptions.retrieve(sub.id);
          const item = full.items?.data?.[0];
          if (!item) {
            failedMigrations.push({ subscriptionId: sub.id, error: 'No subscription items' });
            continue;
          }
          await stripe.subscriptions.update(sub.id, {
            proration_behavior: proration,
            items: [
              {
                id: item.id,
                price: targetPriceId,
                quantity: item.quantity || 1,
              },
            ],
          });
          migratedCount++;
        } catch (e) {
          failedMigrations.push({ subscriptionId: sub.id, error: e.message });
        }
      }

      if (failedMigrations.length > 0 && migratedCount === 0) {
        return fail(
          res,
          'Could not migrate any subscriptions: ' + failedMigrations[0].error,
          500
        );
      }

      const remainingAfter = await listSubscriptionsForProductPrices(
        stripe,
        await listPriceIdsForProduct(stripe, productId)
      );
      if (remainingAfter.length > 0) {
        return fail(
          res,
          'Some subscriptions still reference this plan. Fix errors or retry; no archive/delete was performed.',
          409
        );
      }
    }

    const remaining = await listSubscriptionsForProductPrices(
      stripe,
      await listPriceIdsForProduct(stripe, productId)
    );
    if (remaining.length > 0) {
      return fail(res, 'Subscriptions still reference this product.', 409);
    }

    await stripe.products.update(productId, { active: false });
    for (const pid of priceIds) {
      try {
        await stripe.prices.update(pid, { active: false });
      } catch (e) {
        log('deactivate price skip ' + pid + ': ' + e.message);
      }
    }

    let deleted = false;
    try {
      await stripe.products.del(productId);
      deleted = true;
    } catch (e) {
      log('products.del not available (expected if prices exist): ' + e.message);
    }

    log('admin-delete-plan ' + productId + ' deleted=' + deleted);
    return success(res, {
      mode: deleted ? 'deleted' : 'archived',
      message: deleted
        ? 'Product removed in Stripe.'
        : 'Product and prices archived in Stripe (full delete is not allowed while prices exist).',
      migratedCount: migrateSubscribers ? activeSubs.length : 0,
      failedMigrations: [],
    });
  } catch (err) {
    error('admin-delete-plan: ' + err.message);
    return fail(res, err.message, err.statusCode || 500);
  }
};
