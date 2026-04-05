const Stripe = require("stripe");
const sdk = require("node-appwrite");
const ensureAdmin = require("../lib/ensureAdmin");

function parsePayload(req, payloadFromIndex) {
  if (payloadFromIndex && typeof payloadFromIndex === "object") return payloadFromIndex;
  try {
    if (req.body && typeof req.body === "object") return req.body;
    if (req.body && typeof req.body === "string") return JSON.parse(req.body || "{}");
    if (req.payload && typeof req.payload === "object") return req.payload;
    if (req.payload && typeof req.payload === "string") return JSON.parse(req.payload || "{}");
  } catch (e) {}
  return {};
}

async function resolveHubUsername(client, databases, DATABASE_ID, ACCOUNTS_COLLECTION_ID, users, customerId) {
  if (!customerId || !databases || !users) return null;
  try {
    const accs = await databases.listDocuments(DATABASE_ID, ACCOUNTS_COLLECTION_ID, [
      sdk.Query.equal("stripe_customer_id", customerId),
      sdk.Query.limit(1),
    ]);
    if (!accs.documents?.length) return null;
    const userId = accs.documents[0].user_id;
    if (!userId) return null;
    try {
      const u = await users.get(userId);
      return u.name || u.email || u.$id || null;
    } catch {
      return null;
    }
  } catch {
    return null;
  }
}

function customerDisplayName(custObj, hubName) {
  if (custObj && typeof custObj === "object") {
    const n = (custObj.name || "").trim();
    if (n) return n;
    const e = (custObj.email || "").trim();
    if (e) return e;
  }
  if (hubName) return hubName;
  return "Customer";
}

function subscriptionIdFromInvoice(inv) {
  const s = inv.subscription;
  if (!s) return null;
  return typeof s === "string" ? s : s.id || null;
}

function customerIdFromStripe(ref) {
  if (!ref) return null;
  return typeof ref === "string" ? ref : ref.id || null;
}

function periodWindow(period) {
  const now = Math.floor(Date.now() / 1000);
  const p = String(period || "week").toLowerCase();
  if (p === "day") {
    return {
      period: "day",
      windowStart: now - 7 * 86400,
      windowEnd: now,
      bucketUnit: "day",
      rangeLabel: "Last 7 days (UTC)",
    };
  }
  if (p === "week") {
    return {
      period: "week",
      windowStart: now - 7 * 86400,
      windowEnd: now,
      bucketUnit: "day",
      rangeLabel: "Last 7 days (UTC)",
    };
  }
  if (p === "month") {
    return {
      period: "month",
      windowStart: now - 30 * 86400,
      windowEnd: now,
      bucketUnit: "day",
      rangeLabel: "Last 30 days (UTC)",
    };
  }
  return {
    period: "year",
    windowStart: now - 365 * 86400,
    windowEnd: now,
    bucketUnit: "month",
    rangeLabel: "Last 12 months (UTC)",
  };
}

function startOfUtcDay(ts) {
  const d = new Date(ts * 1000);
  return Math.floor(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / 1000);
}

function startOfUtcMonth(ts) {
  const d = new Date(ts * 1000);
  return Math.floor(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1) / 1000);
}

function buildBuckets(windowStart, windowEnd, bucketUnit) {
  const buckets = [];
  if (bucketUnit === "day") {
    let t = startOfUtcDay(windowStart);
    const end = windowEnd;
    while (t <= end) {
      const next = t + 86400;
      buckets.push({
        key: String(t),
        start: t,
        end: Math.min(next - 1, end),
        label: new Date(t * 1000).toISOString().slice(0, 10),
      });
      t = next;
    }
  } else {
    let t = startOfUtcMonth(windowStart);
    const end = windowEnd;
    while (t <= end) {
      const d = new Date(t * 1000);
      const nextMonth = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1) / 1000;
      buckets.push({
        key: String(t),
        start: t,
        end: Math.min(nextMonth - 1, end),
        label: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`,
      });
      t = nextMonth;
    }
  }
  return buckets;
}

function bucketIndexForTs(buckets, ts) {
  for (let i = 0; i < buckets.length; i++) {
    if (ts >= buckets[i].start && ts <= buckets[i].end) return i;
  }
  return -1;
}

async function countActiveTrialingNow(stripe, maxPages) {
  let total = 0;
  for (const st of ["active", "trialing"]) {
    let startingAfter = null;
    let pages = 0;
    while (pages < maxPages) {
      const p = { status: st, limit: 100 };
      if (startingAfter) p.starting_after = startingAfter;
      const batch = await stripe.subscriptions.list(p);
      pages += 1;
      total += batch.data.length;
      if (!batch.has_more || !batch.data.length) break;
      startingAfter = batch.data[batch.data.length - 1].id;
    }
  }
  return total;
}

async function fetchRecentPaidInvoices(stripe, appwriteCtx) {
  const invs = await stripe.invoices.list({
    status: "paid",
    limit: 20,
    expand: ["data.customer"],
  });

  const rows = [];
  const customerIds = new Set();
  for (const inv of invs.data) {
    const cid = customerIdFromStripe(inv.customer);
    if (cid) customerIds.add(cid);
    rows.push({ inv, customerId: cid });
  }

  const hubByCustomer = {};
  if (appwriteCtx.client && customerIds.size) {
    for (const cid of customerIds) {
      hubByCustomer[cid] = await resolveHubUsername(
        appwriteCtx.client,
        appwriteCtx.databases,
        appwriteCtx.DATABASE_ID,
        appwriteCtx.ACCOUNTS_COLLECTION_ID,
        appwriteCtx.users,
        cid
      );
    }
  }

  return rows.map(({ inv, customerId }) => {
    const cust = typeof inv.customer === "object" && inv.customer ? inv.customer : null;
    const hub = customerId ? hubByCustomer[customerId] : null;
    return {
      id: inv.id,
      number: inv.number || null,
      amount_paid: inv.amount_paid || 0,
      currency: inv.currency || "eur",
      created: inv.created,
      customerId,
      customerDisplayName: customerDisplayName(cust, hub),
      subscriptionId: subscriptionIdFromInvoice(inv),
    };
  });
}

async function getProductName(stripe, productRef) {
  const pid = typeof productRef === "string" ? productRef : productRef?.id;
  if (!pid) return "—";
  try {
    const pr = await stripe.products.retrieve(pid);
    return pr.name || pid;
  } catch {
    return pid;
  }
}

async function priceUnitAmount(stripe, priceRef) {
  const id = typeof priceRef === "string" ? priceRef : priceRef?.id;
  if (!id) return null;
  try {
    const pr = await stripe.prices.retrieve(id);
    return pr.unit_amount != null ? pr.unit_amount : null;
  } catch {
    return null;
  }
}

function firstItemPriceId(subObj) {
  const item = subObj?.items?.data?.[0];
  const p = item?.price;
  return typeof p === "string" ? p : p?.id || null;
}

async function classifyUpdatedEvent(stripe, evt) {
  const obj = evt.data?.object;
  const prev = evt.data?.previous_attributes || {};
  let oldAmount = null;
  let newAmount = null;
  const newPid = firstItemPriceId(obj);
  if (prev.items && obj?.items?.data?.[0]) {
    const prevItems = prev.items;
    const oldData = prevItems?.data?.[0];
    const oldPriceRef = oldData?.price;
    if (oldPriceRef) oldAmount = await priceUnitAmount(stripe, oldPriceRef);
    if (newPid) newAmount = await priceUnitAmount(stripe, newPid);
  }
  if (oldAmount == null || newAmount == null) return { action: "Updated", amountCents: newAmount };
  if (newAmount > oldAmount) return { action: "Upgrade", amountCents: newAmount };
  if (newAmount < oldAmount) return { action: "Downgrade", amountCents: newAmount };
  return { action: "Updated", amountCents: newAmount };
}

async function buildSubscriptionChangeRows(stripe, appwriteCtx, maxEventPages) {
  const thirtyDays = Math.floor(Date.now() / 1000) - 30 * 86400;
  const types = [
    "customer.subscription.created",
    "customer.subscription.deleted",
    "customer.subscription.updated",
  ];
  const allEvents = [];
  let startingAfter = null;
  let pages = 0;
  while (pages < maxEventPages) {
    const params = {
      limit: 100,
      types,
      created: { gte: thirtyDays },
    };
    if (startingAfter) params.starting_after = startingAfter;
    const batch = await stripe.events.list(params);
    pages += 1;
    allEvents.push(...batch.data);
    if (!batch.has_more || !batch.data.length) break;
    startingAfter = batch.data[batch.data.length - 1].id;
  }

  allEvents.sort((a, b) => b.created - a.created);

  const customerIds = new Set();
  const candidates = [];
  for (const evt of allEvents) {
    if (candidates.length >= 28) break;
    const sub = evt.data?.object;
    if (!sub || sub.object !== "subscription") continue;
    const cid = customerIdFromStripe(sub.customer);
    if (cid) customerIds.add(cid);
    candidates.push({ evt, sub, customerId: cid });
  }

  const hubByCustomer = {};
  if (appwriteCtx.client && customerIds.size) {
    for (const cid of customerIds) {
      hubByCustomer[cid] = await resolveHubUsername(
        appwriteCtx.client,
        appwriteCtx.databases,
        appwriteCtx.DATABASE_ID,
        appwriteCtx.ACCOUNTS_COLLECTION_ID,
        appwriteCtx.users,
        cid
      );
    }
  }

  const out = [];
  for (const { evt, sub, customerId } of candidates.slice(0, 25)) {
    const cust =
      typeof sub.customer === "object" && sub.customer
        ? sub.customer
        : null;
    const hub = customerId ? hubByCustomer[customerId] : null;
    const userDisplay = customerDisplayName(cust, hub);

    const item = sub.items?.data?.[0];
    const price = item?.price;
    const planName = await getProductName(stripe, price?.product);
    const amountCents = price?.unit_amount != null ? price.unit_amount : 0;

    let action = "Updated";
    if (evt.type === "customer.subscription.created") action = "New";
    else if (evt.type === "customer.subscription.deleted") action = "Canceled";
    else if (evt.type === "customer.subscription.updated") {
      const c = await classifyUpdatedEvent(stripe, evt);
      action = c.action;
    }

    out.push({
      id: evt.id,
      created: evt.created,
      subscriptionId: sub.id,
      customerId,
      userDisplayName: userDisplay,
      planName,
      amountCents,
      currency: price?.currency || "eur",
      action,
    });
  }
  return out;
}

async function aggregateStats(stripe, cfg, buckets, nowTs) {
  const { windowStart, windowEnd, bucketUnit } = cfg;
  const n = buckets.length;
  const zeros = () => new Array(n).fill(0);

  const revenueByBucket = zeros();
  const newSubsByBucket = zeros();
  const canceledByBucket = zeros();
  const upgradesByBucket = zeros();
  const downgradesByBucket = zeros();
  const cumulativeNet = zeros();

  const byPlanMap = {};

  let revenueTruncated = false;
  let invPages = 0;
  let invStartingAfter = null;
  const maxInvPages = 20;
  while (invPages < maxInvPages) {
    const params = {
      status: "paid",
      limit: 100,
      created: { gte: windowStart, lte: windowEnd },
    };
    if (invStartingAfter) params.starting_after = invStartingAfter;
    const batch = await stripe.invoices.list(params);
    invPages += 1;
    for (const inv of batch.data) {
      const idx = bucketIndexForTs(buckets, inv.created);
      if (idx >= 0) revenueByBucket[idx] += inv.amount_paid || 0;
    }
    if (!batch.has_more || !batch.data.length) break;
    invStartingAfter = batch.data[batch.data.length - 1].id;
  }
  if (invPages >= maxInvPages) revenueTruncated = true;

  const statusesForNew = [
    "active",
    "trialing",
    "past_due",
    "paused",
    "canceled",
    "incomplete",
    "incomplete_expired",
    "unpaid",
  ];
  const seenSubIds = new Set();
  let subPages = 0;
  let subsListingTruncated = false;
  const maxSubPages = 20;
  for (const st of statusesForNew) {
    let subStartingAfter = null;
    while (subPages < maxSubPages) {
      const params = {
        status: st,
        limit: 100,
        created: { gte: windowStart, lte: windowEnd },
        expand: ["data.items.data.price"],
      };
      if (subStartingAfter) params.starting_after = subStartingAfter;
      const batch = await stripe.subscriptions.list(params);
      subPages += 1;
      for (const sub of batch.data) {
        if (seenSubIds.has(sub.id)) continue;
        seenSubIds.add(sub.id);
        const c = sub.created;
        const idx = bucketIndexForTs(buckets, c);
        if (idx >= 0) {
          newSubsByBucket[idx] += 1;
          const item = sub.items?.data?.[0];
          const price = item?.price;
          const pid =
            typeof price?.product === "string"
              ? price.product
              : price?.product?.id || "unknown";
          const pname =
            typeof price?.product === "object" && price?.product?.name
              ? price.product.name
              : pid;
          if (!byPlanMap[pid]) byPlanMap[pid] = { productId: pid, name: pname, count: 0 };
          byPlanMap[pid].count += 1;
        }
      }
      if (!batch.has_more || !batch.data.length) break;
      subStartingAfter = batch.data[batch.data.length - 1].id;
    }
    if (subPages >= maxSubPages) {
      subsListingTruncated = true;
      break;
    }
  }

  let canPages = 0;
  let canStartingAfter = null;
  const maxCanPages = 15;
  while (canPages < maxCanPages) {
    const params = { status: "canceled", limit: 100 };
    if (canStartingAfter) params.starting_after = canStartingAfter;
    const batch = await stripe.subscriptions.list(params);
    canPages += 1;
    for (const sub of batch.data) {
      const cat = sub.canceled_at;
      if (!cat || cat < windowStart || cat > windowEnd) continue;
      const idx = bucketIndexForTs(buckets, cat);
      if (idx >= 0) canceledByBucket[idx] += 1;
    }
    if (!batch.has_more || !batch.data.length) break;
    canStartingAfter = batch.data[batch.data.length - 1].id;
  }

  const eventCutoff = nowTs - 30 * 86400;
  let evPages = 0;
  let evStartingAfter = null;
  const maxEvPages = 8;
  while (evPages < maxEvPages) {
    const params = {
      limit: 100,
      types: ["customer.subscription.updated"],
      created: { gte: eventCutoff },
    };
    if (evStartingAfter) params.starting_after = evStartingAfter;
    const batch = await stripe.events.list(params);
    evPages += 1;
    for (const evt of batch.data) {
      if (evt.type !== "customer.subscription.updated") continue;
      const prev = evt.data?.previous_attributes || {};
      if (!prev.items) continue;
      const c = await classifyUpdatedEvent(stripe, evt);
      if (c.action !== "Upgrade" && c.action !== "Downgrade") continue;
      const idx = bucketIndexForTs(buckets, evt.created);
      if (idx < 0) continue;
      if (evt.created < eventCutoff) continue;
      if (c.action === "Upgrade") upgradesByBucket[idx] += 1;
      else downgradesByBucket[idx] += 1;
    }
    if (!batch.has_more || !batch.data.length) break;
    evStartingAfter = batch.data[batch.data.length - 1].id;
  }

  let run = 0;
  for (let i = 0; i < n; i++) {
    run += newSubsByBucket[i] - canceledByBucket[i];
    cumulativeNet[i] = run;
  }

  let revenueAllTimeCents = 0;
  let allTimePages = 0;
  let allTimeStartingAfter = null;
  let revenueAllTimeTruncated = false;
  const maxAllTimePages = 25;
  while (allTimePages < maxAllTimePages) {
    const params = { status: "paid", limit: 100 };
    if (allTimeStartingAfter) params.starting_after = allTimeStartingAfter;
    const batch = await stripe.invoices.list(params);
    allTimePages += 1;
    for (const inv of batch.data) {
      revenueAllTimeCents += inv.amount_paid || 0;
    }
    if (!batch.has_more || !batch.data.length) break;
    allTimeStartingAfter = batch.data[batch.data.length - 1].id;
  }
  if (allTimePages >= maxAllTimePages) revenueAllTimeTruncated = true;

  const activeSubscriptionsNow = await countActiveTrialingNow(stripe, 8);

  const byPlan = Object.values(byPlanMap).sort((a, b) => b.count - a.count);

  return {
    buckets: buckets.map((b, i) => ({
      label: b.label,
      start: b.start,
      end: b.end,
      revenueCents: revenueByBucket[i],
      newSubscriptions: newSubsByBucket[i],
      cancellations: canceledByBucket[i],
      upgrades: upgradesByBucket[i],
      downgrades: downgradesByBucket[i],
      cumulativeNetSubscriptions: cumulativeNet[i],
    })),
    kpis: {
      activeSubscriptionsNow,
      newInPeriod: newSubsByBucket.reduce((a, b) => a + b, 0),
      canceledInPeriod: canceledByBucket.reduce((a, b) => a + b, 0),
      revenueInPeriodCents: revenueByBucket.reduce((a, b) => a + b, 0),
      revenueAllTimeCents,
      revenueAllTimeTruncated,
      upgradesInPeriod: upgradesByBucket.reduce((a, b) => a + b, 0),
      downgradesInPeriod: downgradesByBucket.reduce((a, b) => a + b, 0),
    },
    byPlan,
    truncated: revenueTruncated || subsListingTruncated,
    upgradeDowngradeNote:
      "Upgrade/downgrade counts use Stripe events (about the last 30 days). Older periods in a year view show 0 for those series.",
  };
}

module.exports = async ({ req, res, log, error, payload: payloadFromIndex }) => {
  const STRIPE_SECRET_KEY =
    req.variables?.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY;
  const APPWRITE_ENDPOINT =
    req.variables?.APPWRITE_ENDPOINT ||
    process.env.APPWRITE_ENDPOINT ||
    process.env.APPWRITE_FUNCTION_ENDPOINT ||
    process.env.APPWRITE_FUNCTION_API_ENDPOINT;
  const APPWRITE_PROJECT_ID =
    req.variables?.APPWRITE_PROJECT_ID ||
    process.env.APPWRITE_PROJECT_ID ||
    process.env.APPWRITE_FUNCTION_PROJECT_ID;
  const APPWRITE_API_KEY =
    req.variables?.APPWRITE_API_KEY ||
    process.env.APPWRITE_API_KEY ||
    process.env.APPWRITE_FUNCTION_API_KEY ||
    process.env.APPWRITE_KEY;
  const DATABASE_ID =
    req.variables?.DATABASE_ID ||
    process.env.APPWRITE_DATABASE_ID ||
    process.env.DATABASE_ID ||
    "platform_db";
  const ACCOUNTS_COLLECTION_ID =
    req.variables?.ACCOUNTS_COLLECTION_ID ||
    process.env.APPWRITE_ACCOUNTS_COLLECTION_ID ||
    process.env.ACCOUNTS_COLLECTION_ID ||
    "accounts";

  if (!STRIPE_SECRET_KEY) {
    return res.json({ success: false, error: "Missing STRIPE_SECRET_KEY" }, 500);
  }
  if (!(await ensureAdmin(req))) {
    return res.json({ success: false, error: "Admin access required" }, 403);
  }

  const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" });
  const payload = parsePayload(req, payloadFromIndex);
  const period = payload.period || "week";

  let appwriteCtx = { client: null, databases: null, users: null, DATABASE_ID, ACCOUNTS_COLLECTION_ID };
  if (APPWRITE_ENDPOINT && APPWRITE_PROJECT_ID && APPWRITE_API_KEY) {
    const client = new sdk.Client()
      .setEndpoint(APPWRITE_ENDPOINT)
      .setProject(APPWRITE_PROJECT_ID)
      .setKey(APPWRITE_API_KEY);
    appwriteCtx = {
      client,
      databases: new sdk.Databases(client),
      users: new sdk.Users(client),
      DATABASE_ID,
      ACCOUNTS_COLLECTION_ID,
    };
  }

  try {
    const cfg = periodWindow(period);
    const nowTs = Math.floor(Date.now() / 1000);
    const buckets = buildBuckets(cfg.windowStart, cfg.windowEnd, cfg.bucketUnit);

    const [recentPaidInvoices, recentSubscriptionChanges, stats] = await Promise.all([
      fetchRecentPaidInvoices(stripe, appwriteCtx),
      buildSubscriptionChangeRows(stripe, appwriteCtx, 8),
      aggregateStats(stripe, cfg, buckets, nowTs),
    ]);

    return res.json({
      success: true,
      period: cfg.period,
      rangeLabel: cfg.rangeLabel,
      windowStart: cfg.windowStart,
      windowEnd: cfg.windowEnd,
      recentPaidInvoices,
      recentSubscriptionChanges,
      stats: {
        ...stats,
        rangeLabel: cfg.rangeLabel,
      },
    });
  } catch (e) {
    error("admin-finance-dashboard: " + e.message);
    return res.json({ success: false, error: e.message }, e.statusCode || 500);
  }
};
