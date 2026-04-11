const { success, fail } = require('../lib/responses');
const { getProviderCredentials } = require('../lib/vault');

const MAX_INVOICE_PAGES = 30;
const MAX_EVENT_PAGES = 15;
const MAX_STATUS_PAGES = 40;
const MAX_ALLTIME_INVOICE_PAGES = 25;

function buildTimeBuckets(period, windowStart, windowEnd) {
  const buckets = [];
  if (period === 'day' || period === 'week') {
    for (let i = 0; i < 7; i++) {
      const start = windowStart + i * 86400;
      const end = Math.min(start + 86400 - 1, windowEnd);
      const d = new Date(start * 1000);
      const label = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
      buckets.push({
        label,
        start,
        end,
        revenueCents: 0,
        newSubscriptions: 0,
        cancellations: 0,
        upgrades: 0,
        downgrades: 0,
        cumulativeNetSubscriptions: 0,
      });
    }
  } else if (period === 'month') {
    const span = windowEnd - windowStart;
    const num = 10;
    const step = Math.max(86400, Math.floor(span / num));
    for (let i = 0; i < num; i++) {
      const start = windowStart + i * step;
      const end = i === num - 1 ? windowEnd : Math.min(windowStart + (i + 1) * step - 1, windowEnd);
      const d = new Date(start * 1000);
      const label = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      buckets.push({
        label,
        start,
        end,
        revenueCents: 0,
        newSubscriptions: 0,
        cancellations: 0,
        upgrades: 0,
        downgrades: 0,
        cumulativeNetSubscriptions: 0,
      });
    }
  } else {
    const span = windowEnd - windowStart;
    const num = 12;
    const step = Math.floor(span / num);
    for (let i = 0; i < num; i++) {
      const start = windowStart + i * step;
      const end = i === num - 1 ? windowEnd : Math.min(windowStart + (i + 1) * step - 1, windowEnd);
      const d = new Date(start * 1000);
      const label = d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
      buckets.push({
        label,
        start,
        end,
        revenueCents: 0,
        newSubscriptions: 0,
        cancellations: 0,
        upgrades: 0,
        downgrades: 0,
        cumulativeNetSubscriptions: 0,
      });
    }
  }
  return buckets;
}

function bucketIndex(buckets, ts) {
  if (ts == null || typeof ts !== 'number') return -1;
  for (let i = 0; i < buckets.length; i++) {
    const b = buckets[i];
    if (ts >= b.start && ts <= b.end) return i;
  }
  return -1;
}

async function listEventsInWindow(stripe, type, windowStart, windowEnd, maxPages, log) {
  const out = [];
  let startingAfter;
  let truncated = false;
  for (let page = 0; page < maxPages; page++) {
    log(`adminFinanceDashboard: events.list type=${type} page=${page}`);
    const batch = await stripe.events.list({
      type,
      created: { gte: windowStart, lte: windowEnd },
      limit: 100,
      starting_after: startingAfter,
    });
    out.push(...batch.data);
    if (!batch.has_more || !batch.data.length) break;
    startingAfter = batch.data[batch.data.length - 1].id;
    if (page === maxPages - 1 && batch.has_more) truncated = true;
  }
  return { events: out, truncated };
}

async function countSubscriptionsForStatuses(stripe, statuses, maxPagesPerStatus, log) {
  let total = 0;
  let truncated = false;
  for (const status of statuses) {
    let startingAfter;
    for (let page = 0; page < maxPagesPerStatus; page++) {
      log(`adminFinanceDashboard: subscriptions.list status=${status} page=${page}`);
      const batch = await stripe.subscriptions.list({
        status,
        limit: 100,
        starting_after: startingAfter,
      });
      total += batch.data.length;
      if (!batch.has_more || !batch.data.length) break;
      startingAfter = batch.data[batch.data.length - 1].id;
      if (page === maxPagesPerStatus - 1 && batch.has_more) truncated = true;
    }
  }
  return { total, truncated };
}

function productIdFromSubscription(sub) {
  const p = sub?.items?.data?.[0]?.price?.product;
  if (typeof p === 'string') return p;
  if (p && typeof p === 'object' && p.id) return p.id;
  return null;
}

function classifyUpgradeDowngrade(ev) {
  const prev = ev.data?.previous_attributes;
  const cur = ev.data?.object;
  if (!prev?.items || !cur?.items?.data?.[0]?.price) return null;
  const oldItem = prev.items?.data?.[0];
  const newItem = cur.items.data[0];
  const oldAmt = oldItem?.price?.unit_amount;
  const newAmt = newItem?.price?.unit_amount;
  if (oldAmt == null || newAmt == null || oldAmt === newAmt) return null;
  return newAmt > oldAmt ? 'up' : 'down';
}

function mapSubscriptionEventToChangeRow(ev) {
  const sub = ev.data?.object;
  if (!sub?.id) return null;
  const subscriptionId = sub.id;
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id ?? null;
  let action = 'New';
  if (ev.type === 'customer.subscription.deleted') action = 'Canceled';
  else if (ev.type === 'customer.subscription.updated') {
    const cls = classifyUpgradeDowngrade(ev);
    if (cls === 'up') action = 'Upgrade';
    else if (cls === 'down') action = 'Downgrade';
    else action = 'Updated';
  }
  const price = sub.items?.data?.[0]?.price;
  const planName = price?.nickname || price?.id || '—';
  return {
    id: ev.id,
    created: ev.created,
    subscriptionId,
    customerId,
    userDisplayName: customerId ? `Customer ${String(customerId).slice(-8)}` : '—',
    planName,
    amountCents: price?.unit_amount ?? 0,
    currency: price?.currency || 'usd',
    action,
  };
}

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
    log(`adminFinanceDashboard: Period="${period}" window ${windowStart}–${windowEnd}`);

    const buckets = buildTimeBuckets(period, windowStart, windowEnd);
    const planCounts = Object.create(null);
    let truncated = false;
    let eventsTruncated = false;

    log('adminFinanceDashboard: Querying paid invoices (filter by paid_at in window)');
    /** Include invoices created slightly before the window so late-paid invoices still appear; revenue uses paid_at. */
    const invoiceListCreatedGte = windowStart - 21 * 86400;
    let revenueInPeriodCents = 0;
    let invStartingAfter;
    for (let page = 0; page < MAX_INVOICE_PAGES; page++) {
      const batch = await stripe.invoices.list({
        status: 'paid',
        created: { gte: invoiceListCreatedGte, lte: windowEnd },
        limit: 100,
        starting_after: invStartingAfter,
      });
      for (const inv of batch.data) {
        const paidAt = inv.status_transitions?.paid_at || inv.created;
        if (paidAt < windowStart || paidAt > windowEnd) continue;
        const amt = inv.amount_paid || 0;
        revenueInPeriodCents += amt;
        const bi = bucketIndex(buckets, paidAt);
        if (bi >= 0) buckets[bi].revenueCents += amt;
      }
      if (!batch.has_more || !batch.data.length) break;
      invStartingAfter = batch.data[batch.data.length - 1].id;
      if (page === MAX_INVOICE_PAGES - 1 && batch.has_more) truncated = true;
    }

    log('adminFinanceDashboard: Listing subscription lifecycle events');
    const createdRes = await listEventsInWindow(
      stripe,
      'customer.subscription.created',
      windowStart,
      windowEnd,
      MAX_EVENT_PAGES,
      log,
    );
    const deletedRes = await listEventsInWindow(
      stripe,
      'customer.subscription.deleted',
      windowStart,
      windowEnd,
      MAX_EVENT_PAGES,
      log,
    );
    const updatedRes = await listEventsInWindow(
      stripe,
      'customer.subscription.updated',
      windowStart,
      windowEnd,
      MAX_EVENT_PAGES,
      log,
    );
    if (createdRes.truncated || deletedRes.truncated || updatedRes.truncated) eventsTruncated = true;
    const createdEvents = createdRes.events;
    const deletedEvents = deletedRes.events;
    const updatedEvents = updatedRes.events;

    let newInPeriod = 0;
    for (const ev of createdEvents) {
      newInPeriod++;
      const bi = bucketIndex(buckets, ev.created);
      if (bi >= 0) buckets[bi].newSubscriptions++;
      const sub = ev.data?.object;
      const pid = productIdFromSubscription(sub);
      if (pid) planCounts[pid] = (planCounts[pid] || 0) + 1;
    }

    let canceledInPeriod = 0;
    for (const ev of deletedEvents) {
      canceledInPeriod++;
      const bi = bucketIndex(buckets, ev.created);
      if (bi >= 0) buckets[bi].cancellations++;
    }

    let upgradesInPeriod = 0;
    let downgradesInPeriod = 0;
    for (const ev of updatedEvents) {
      const cls = classifyUpgradeDowngrade(ev);
      if (!cls) continue;
      const bi = bucketIndex(buckets, ev.created);
      if (cls === 'up') {
        upgradesInPeriod++;
        if (bi >= 0) buckets[bi].upgrades++;
      } else {
        downgradesInPeriod++;
        if (bi >= 0) buckets[bi].downgrades++;
      }
    }

    let run = 0;
    for (const b of buckets) {
      run += b.newSubscriptions - b.cancellations;
      b.cumulativeNetSubscriptions = run;
    }

    log('adminFinanceDashboard: Counting active + trialing');
    const { total: activeTrialing, truncated: statusTruncated } = await countSubscriptionsForStatuses(
      stripe,
      ['active', 'trialing'],
      MAX_STATUS_PAGES,
      log,
    );
    if (statusTruncated) truncated = true;

    log('adminFinanceDashboard: All-time paid revenue sample');
    let revenueAllTimeCents = 0;
    let revenueAllTimeTruncated = false;
    let allTimeAfter;
    for (let page = 0; page < MAX_ALLTIME_INVOICE_PAGES; page++) {
      const batch = await stripe.invoices.list({
        status: 'paid',
        limit: 100,
        starting_after: allTimeAfter,
      });
      for (const inv of batch.data) {
        revenueAllTimeCents += inv.amount_paid || 0;
      }
      if (!batch.has_more || !batch.data.length) break;
      allTimeAfter = batch.data[batch.data.length - 1].id;
      if (page === MAX_ALLTIME_INVOICE_PAGES - 1 && batch.has_more) revenueAllTimeTruncated = true;
    }

    const byPlan = [];
    const productIds = Object.keys(planCounts);
    for (const pid of productIds) {
      try {
        const p = await stripe.products.retrieve(pid);
        byPlan.push({ productId: pid, name: p.name || pid, count: planCounts[pid] });
      } catch (_) {
        byPlan.push({ productId: pid, name: pid, count: planCounts[pid] });
      }
    }
    byPlan.sort((a, b) => b.count - a.count);

    log('adminFinanceDashboard: Recent paid invoices (global)');
    const recentPaidInvoicesResp = await stripe.invoices.list({
      status: 'paid',
      limit: 20,
      expand: ['data.customer', 'data.subscription'],
    });

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

    let recentSubscriptionChanges = [];
    try {
      const recentWindow = { gte: now - 30 * 86400, lte: now };
      const [evCreated, evUpdated, evDeleted] = await Promise.all([
        stripe.events.list({ type: 'customer.subscription.created', created: recentWindow, limit: 15 }),
        stripe.events.list({ type: 'customer.subscription.updated', created: recentWindow, limit: 15 }),
        stripe.events.list({ type: 'customer.subscription.deleted', created: recentWindow, limit: 15 }),
      ]);
      const merged = [...evCreated.data, ...evUpdated.data, ...evDeleted.data].sort(
        (a, b) => b.created - a.created,
      );
      recentSubscriptionChanges = merged.slice(0, 25).map(mapSubscriptionEventToChangeRow).filter(Boolean);
    } catch (e) {
      log(`adminFinanceDashboard: recent events mix failed: ${e.message}`);
      recentSubscriptionChanges = [];
    }

    const rangeLabelByPeriod = {
      day: 'Last 7 days',
      week: 'Last 7 days',
      month: 'Last 30 days',
      year: 'Last 365 days',
    };
    const rangeLabel = rangeLabelByPeriod[period] || 'Selected range';

    const stats = {
      buckets,
      kpis: {
        activeSubscriptionsNow: activeTrialing,
        newInPeriod,
        canceledInPeriod,
        revenueInPeriodCents,
        revenueAllTimeCents,
        revenueAllTimeTruncated,
        upgradesInPeriod,
        downgradesInPeriod,
      },
      byPlan,
      truncated: truncated || eventsTruncated,
    };

    log(`adminFinanceDashboard: SUCCESS - duration=${Date.now() - startTime}ms`);
    return success(res, {
      success: true,
      period,
      rangeLabel,
      windowStart,
      windowEnd,
      recentPaidInvoices: recentPaidInvoicesResp.data.slice(0, 10).map(mapInvoiceRow),
      recentSubscriptionChanges,
      stats,
    });
  } catch (err) {
    error(`adminFinanceDashboard: FAILED after ${Date.now() - startTime}ms - ${err.message}`);
    return fail(res, err.message, 500);
  }
};
