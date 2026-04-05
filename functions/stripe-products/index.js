const Stripe = require("stripe");
const sdk = require("node-appwrite");

const handleDeletePlan = require("./handlers/admin-delete-plan");

function parsePayload(req) {
  if (!req) return {};
  if (req.body && typeof req.body === "object") return req.body;
  if (req.bodyRaw && typeof req.bodyRaw === "string") {
    try { return JSON.parse(req.bodyRaw); } catch { return {}; }
  }
  if (req.payload && typeof req.payload === "string") {
    try { return JSON.parse(req.payload); } catch { return {}; }
  }
  if (req.payload && typeof req.payload === "object") return req.payload;
  return req.query || {};
}

async function handleListProducts(req, res, log, error) {
  const STRIPE_SECRET_KEY = req.variables?.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY;
  if (!STRIPE_SECRET_KEY) {
    return res.json({ success: false, message: "Stripe configuration missing", plans: [] }, 500);
  }
  const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" });
  const payload = parsePayload(req);
  const activeOnly = payload.active_only !== "false" && payload.active_only !== false;
  const includePrices = payload.include_prices !== "false" && payload.include_prices !== false;
  const excludeHidden = payload.exclude_hidden === true || payload.exclude_hidden === "true";
  const excludeNonSellable = payload.exclude_non_sellable === true || payload.exclude_non_sellable === "true";

  const productsParams = { limit: 100, expand: ["data.default_price"] };
  if (activeOnly) productsParams.active = true;

  const products = await stripe.products.list(productsParams);
  let allPrices = [];
  if (includePrices) {
    const pricesParams = { limit: 100 };
    if (activeOnly) pricesParams.active = true;
    const pricesResponse = await stripe.prices.list(pricesParams);
    allPrices = pricesResponse.data;
  }

  let plans = await Promise.all(
    products.data.map(async (product) => {
      const productPrices = allPrices.filter((price) => {
        const pid = typeof price.product === "string" ? price.product : price.product?.id;
        return pid === product.id;
      });
      const monthlyPrice = productPrices.find((p) => p.recurring?.interval === "month");
      const yearlyPrice = productPrices.find((p) => p.recurring?.interval === "year");
      const metadata = Object.entries(product.metadata || {}).map(([key, value]) => ({ key, value }));
      const metaMap = Object.fromEntries(metadata);
      if (excludeHidden && metaMap.hidden === "true") return null;
      if (excludeNonSellable && metaMap.non_sellable === "true") return null;

      return {
        id: product.id,
        name: product.name,
        description: product.description || "",
        status: product.active ? "active" : "inactive",
        monthlyPrice: monthlyPrice ? monthlyPrice.unit_amount / 100 : 0,
        yearlyPrice: yearlyPrice ? yearlyPrice.unit_amount / 100 : 0,
        monthlyPriceId: monthlyPrice?.id || null,
        yearlyPriceId: yearlyPrice?.id || null,
        currency: monthlyPrice?.currency || yearlyPrice?.currency || "usd",
        metadata,
        images: product.images || [],
        created: product.created,
        updated: product.updated,
        stripeLink: `https://dashboard.stripe.com/products/${product.id}`,
        allPrices: productPrices.map((price) => ({
          id: price.id,
          amount: price.unit_amount / 100,
          currency: price.currency,
          interval: price.recurring?.interval || "one_time",
          interval_count: price.recurring?.interval_count || 1,
        })),
      };
    })
  );

  plans = plans.filter(Boolean);

  const includeCounts =
    payload.include_active_subscription_counts === true ||
    payload.include_active_subscription_counts === "true";
  let subscriptionCountsTruncated = false;
  const MAX_PRODUCTS_FOR_SUBSCRIPTION_COUNTS = 40;
  const MAX_PAGES_PER_PRICE_FOR_LIST = 15;

  if (includeCounts && plans.length && (await ensureAdmin(req))) {
    const slice = plans.slice(0, MAX_PRODUCTS_FOR_SUBSCRIPTION_COUNTS);
    if (plans.length > MAX_PRODUCTS_FOR_SUBSCRIPTION_COUNTS) subscriptionCountsTruncated = true;

    for (let i = 0; i < slice.length; i += 1) {
      const planRow = slice[i];
      try {
        const { count, truncated } = await countActiveSubscriptionsForProduct(stripe, planRow.id, {
          maxPagesPerPrice: MAX_PAGES_PER_PRICE_FOR_LIST,
        });
        planRow.activeSubscriptionsCount = count;
        if (truncated) subscriptionCountsTruncated = true;
      } catch {
        subscriptionCountsTruncated = true;
      }
    }
  }

  const out = { success: true, plans, total: plans.length };
  if (includeCounts && subscriptionCountsTruncated) out.subscriptionCountsTruncated = true;
  return res.json(out);
}

async function handleCreate(req, res, log, error) {
  const STRIPE_SECRET_KEY = req.variables?.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY;
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

  if (!STRIPE_SECRET_KEY) {
    return res.json({ success: false, message: "Stripe configuration missing" }, 500);
  }
  if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT_ID || !APPWRITE_API_KEY) {
    return res.json({ success: false, message: "Appwrite configuration missing" }, 500);
  }

  const userId = process.env.APPWRITE_FUNCTION_USER_ID || req.headers?.["x-appwrite-user-id"];
  if (!userId) {
    return res.json({ success: false, message: "User not authenticated" }, 401);
  }

  // Admin check
  const client = new sdk.Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID)
    .setKey(APPWRITE_API_KEY);
  const teams = new sdk.Teams(client);
  const users = new sdk.Users(client);
  let isAdmin = false;
  try {
    const memberships = await teams.listMemberships("admin");
    isAdmin = memberships.memberships.some((m) => m.userId === userId);
  } catch {
    try {
      const user = await users.get(userId);
      isAdmin = user.labels?.some(
        (l) => l.toLowerCase() === "admin" || l.toLowerCase() === "administrator"
      );
    } catch {}
  }
  if (!isAdmin) {
    return res.json({ success: false, message: "Admin access required" }, 403);
  }

  const payload = parsePayload(req);
  const { name, description, label, sites_limit, library_limit, storage_limit, monthlyAmount, yearlyAmount, currency, non_sellable, hidden } = payload;

  if (!name) {
    return res.json({ success: false, message: "name is required" }, 400);
  }

  const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" });

  const metadata = { label: label || name.toLowerCase().replace(/\s+/g, "_") };
  if (sites_limit != null) metadata.sites_limit = String(sites_limit);
  if (library_limit != null) metadata.library_limit = String(library_limit);
  if (storage_limit != null) metadata.storage_limit = String(storage_limit);
  metadata.non_sellable = non_sellable === true || non_sellable === "true" ? "true" : "false";
  metadata.hidden = hidden === true || hidden === "true" ? "true" : "false";

  const product = await stripe.products.create({
    name,
    description: description || "",
    metadata,
  });

  const prices = [];
  const curr = currency || "usd";

  if (monthlyAmount != null && monthlyAmount > 0) {
    const monthlyPrice = await stripe.prices.create({
      product: product.id,
      unit_amount: Math.round(parseFloat(monthlyAmount) * 100),
      currency: curr,
      recurring: { interval: "month", interval_count: 1 },
      metadata: { label: metadata.label, billing_period: "monthly" },
    });
    prices.push({ id: monthlyPrice.id, amount: monthlyAmount, interval: "month" });
  }
  if (yearlyAmount != null && yearlyAmount > 0) {
    const yearlyPrice = await stripe.prices.create({
      product: product.id,
      unit_amount: Math.round(parseFloat(yearlyAmount) * 100),
      currency: curr,
      recurring: { interval: "year", interval_count: 1 },
      metadata: { label: metadata.label, billing_period: "yearly" },
    });
    prices.push({ id: yearlyPrice.id, amount: yearlyAmount, interval: "year" });
  }

  log("Created product: " + product.id);
  return res.json({
    success: true,
    productId: product.id,
    productName: product.name,
    prices,
  });
}

async function handleUpdate(req, res, log, error) {
  const STRIPE_SECRET_KEY = req.variables?.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY;
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

  if (!STRIPE_SECRET_KEY) {
    return res.json({ success: false, message: "Stripe configuration missing" }, 500);
  }
  if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT_ID || !APPWRITE_API_KEY) {
    return res.json({ success: false, message: "Appwrite configuration missing" }, 500);
  }

  const userId = process.env.APPWRITE_FUNCTION_USER_ID || req.headers?.["x-appwrite-user-id"];
  if (!userId) {
    return res.json({ success: false, message: "User not authenticated" }, 401);
  }

  const client = new sdk.Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID)
    .setKey(APPWRITE_API_KEY);
  const teams = new sdk.Teams(client);
  const users = new sdk.Users(client);
  let isAdmin = false;
  try {
    const memberships = await teams.listMemberships("admin");
    isAdmin = memberships.memberships.some((m) => m.userId === userId);
  } catch {
    try {
      const user = await users.get(userId);
      isAdmin = user.labels?.some(
        (l) => l.toLowerCase() === "admin" || l.toLowerCase() === "administrator"
      );
    } catch {}
  }
  if (!isAdmin) {
    return res.json({ success: false, message: "Admin access required" }, 403);
  }

  const payload = parsePayload(req);
  const { productId, name, description, sites_limit, library_limit, storage_limit, non_sellable, hidden } = payload;

  if (!productId) {
    return res.json({ success: false, message: "productId is required" }, 400);
  }

  const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" });

  const updateData = {};
  if (name != null) updateData.name = String(name);
  if (description != null) updateData.description = String(description);
  if (sites_limit != null || library_limit != null || storage_limit != null || non_sellable != null || hidden != null) {
    const product = await stripe.products.retrieve(productId);
    const metadata = { ...(product.metadata || {}) };
    if (sites_limit != null) metadata.sites_limit = String(sites_limit);
    if (library_limit != null) metadata.library_limit = String(library_limit);
    if (storage_limit != null) metadata.storage_limit = String(storage_limit);
    if (non_sellable != null) metadata.non_sellable = non_sellable === true || non_sellable === "true" ? "true" : "false";
    if (hidden != null) metadata.hidden = hidden === true || hidden === "true" ? "true" : "false";
    updateData.metadata = metadata;
  }

  if (Object.keys(updateData).length === 0) {
    return res.json({ success: false, message: "No fields to update" }, 400);
  }

  const updated = await stripe.products.update(productId, updateData);
  log("Updated product: " + productId);
  return res.json({
    success: true,
    productId: updated.id,
    productName: updated.name,
  });
}

const SUBSCRIPTION_COUNT_STATUSES = ["active", "trialing", "past_due", "paused"];

/** Active + inactive prices for a product (subscriptions may reference archived prices). */
async function getProductPricesBundle(stripe, productId) {
  const [activePricesRes, inactivePricesRes] = await Promise.all([
    stripe.prices.list({ product: productId, limit: 100, active: true }),
    stripe.prices.list({ product: productId, limit: 100, active: false }),
  ]);
  const seenIds = new Set();
  const allPrices = [...activePricesRes.data, ...inactivePricesRes.data].filter((p) => {
    if (seenIds.has(p.id)) return false;
    seenIds.add(p.id);
    return true;
  });
  const priceIds = allPrices.map((p) => p.id).filter(Boolean);
  const pricesTruncated = Boolean(activePricesRes.has_more || inactivePricesRes.has_more);
  return { allPrices, priceIds, pricesTruncated };
}

/**
 * Dedupe by subscription id across all prices on the product (same notion as plan detail).
 * @returns {{ count: number, truncated: boolean }}
 */
async function countActiveSubscriptionsForProduct(stripe, productId, { maxPagesPerPrice = 15 } = {}) {
  const { priceIds, pricesTruncated } = await getProductPricesBundle(stripe, productId);
  const seenSubIds = new Set();
  let truncated = pricesTruncated;

  for (const priceId of priceIds) {
    let hasMore = true;
    let startingAfter = null;
    let pagesForPrice = 0;
    while (hasMore) {
      if (pagesForPrice >= maxPagesPerPrice) {
        truncated = true;
        break;
      }
      pagesForPrice += 1;
      const subsParams = { price: priceId, status: "all", limit: 100 };
      if (startingAfter) subsParams.starting_after = startingAfter;
      const subs = await stripe.subscriptions.list(subsParams);
      for (const sub of subs.data) {
        if (SUBSCRIPTION_COUNT_STATUSES.includes(sub.status)) seenSubIds.add(sub.id);
      }
      hasMore = subs.has_more;
      if (subs.data.length) startingAfter = subs.data[subs.data.length - 1].id;
      else hasMore = false;
    }
  }

  return { count: seenSubIds.size, truncated };
}

async function ensureAdmin(req) {
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
  const userId = process.env.APPWRITE_FUNCTION_USER_ID || req.headers?.["x-appwrite-user-id"];
  if (!userId || !APPWRITE_ENDPOINT || !APPWRITE_PROJECT_ID || !APPWRITE_API_KEY) return false;
  const client = new sdk.Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID)
    .setKey(APPWRITE_API_KEY);
  const teams = new sdk.Teams(client);
  const users = new sdk.Users(client);
  try {
    const memberships = await teams.listMemberships("admin");
    if (memberships.memberships.some((m) => m.userId === userId)) return true;
  } catch {}
  try {
    const user = await users.get(userId);
    if (user.labels?.some((l) => l.toLowerCase() === "admin" || l.toLowerCase() === "administrator")) return true;
  } catch {}
  return false;
}

async function handleGet(req, res, log, error) {
  const STRIPE_SECRET_KEY = req.variables?.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY;
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
  const DATABASE_ID = req.variables?.DATABASE_ID || process.env.DATABASE_ID;
  const ACCOUNTS_COLLECTION_ID = req.variables?.ACCOUNTS_COLLECTION_ID || process.env.ACCOUNTS_COLLECTION_ID;

  if (!STRIPE_SECRET_KEY) {
    return res.json({ success: false, message: "Stripe configuration missing" }, 500);
  }
  if (!(await ensureAdmin(req))) {
    return res.json({ success: false, message: "Admin access required" }, 403);
  }

  const payload = parsePayload(req);
  const productId = payload.product_id || payload.productId;
  if (!productId) {
    return res.json({ success: false, message: "product_id is required" }, 400);
  }

  const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" });

  const product = await stripe.products.retrieve(productId);
  const { allPrices, priceIds } = await getProductPricesBundle(stripe, productId);
  const monthlyPrice = allPrices.find((p) => p.recurring?.interval === "month");
  const yearlyPrice = allPrices.find((p) => p.recurring?.interval === "year");

  const metadata = Object.entries(product.metadata || {}).map(([key, value]) => ({ key, value }));

  const plan = {
    id: product.id,
    name: product.name,
    description: product.description || "",
    status: product.active ? "active" : "inactive",
    monthlyPrice: monthlyPrice ? monthlyPrice.unit_amount / 100 : 0,
    yearlyPrice: yearlyPrice ? yearlyPrice.unit_amount / 100 : 0,
    monthlyPriceId: monthlyPrice?.id || null,
    yearlyPriceId: yearlyPrice?.id || null,
    currency: monthlyPrice?.currency || yearlyPrice?.currency || "usd",
    metadata,
    stripeLink: `https://dashboard.stripe.com/products/${product.id}`,
  };

  let totalSubscriptions = 0;
  let subscriptionsMonthly = 0;
  let subscriptionsYearly = 0;
  let totalEarnings = 0;
  const subscribers = [];
  const customerIds = new Set();
  const now = Math.floor(Date.now() / 1000);
  const seenSubscriptionIds = new Set();

  for (const priceId of priceIds) {
    let hasMore = true;
    let startingAfter = null;
    while (hasMore) {
      const subsParams = { price: priceId, status: "all", limit: 100, expand: ["data.customer", "data.items.data.price"] };
      if (startingAfter) subsParams.starting_after = startingAfter;
      const subs = await stripe.subscriptions.list(subsParams);
      for (const sub of subs.data) {
        if (seenSubscriptionIds.has(sub.id)) continue;
        const status = sub.status;
        if (SUBSCRIPTION_COUNT_STATUSES.includes(status)) {
          seenSubscriptionIds.add(sub.id);
          totalSubscriptions++;
          const priceItem = sub.items?.data?.[0];
          const price = priceItem?.price;
          const interval = price?.recurring?.interval || "month";
          const intervalCount = price?.recurring?.interval_count || 1;
          const unitAmount = price?.unit_amount ?? 0;
          const quantity = priceItem?.quantity ?? 1;
          if (interval === "month") subscriptionsMonthly++;
          else subscriptionsYearly++;

          const amountCents = (typeof unitAmount === "number" && unitAmount > 0)
            ? unitAmount
            : (allPrices.find((p) => p.id === (typeof price === "string" ? price : price?.id))?.unit_amount ?? 0);
          if (amountCents > 0) {
            const startDate = sub.trial_end && sub.trial_end > now ? null : (sub.trial_end || sub.created);
            if (startDate) {
              const periodSeconds = interval === "year"
                ? 365 * 24 * 3600 * intervalCount
                : 30 * 24 * 3600 * intervalCount;
              const elapsed = now - startDate;
              const completedPeriods = Math.max(0, Math.floor(elapsed / periodSeconds));
              totalEarnings += (amountCents / 100) * quantity * completedPeriods;
            }
          }

          const custId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
          if (custId && !customerIds.has(custId)) {
            customerIds.add(custId);
            let customerEmail = "";
            let customerName = "";
            if (typeof sub.customer === "object" && sub.customer) {
              customerEmail = sub.customer.email || "";
              customerName = sub.customer.name || "";
            } else {
              try {
                const cust = await stripe.customers.retrieve(custId);
                customerEmail = cust.email || "";
                customerName = cust.name || "";
              } catch {}
            }
            subscribers.push({
              subscriptionId: sub.id,
              customerId: custId,
              email: customerEmail,
              name: customerName,
              billingInterval: interval,
              subscribedSince: sub.created,
              status,
            });
          }
        }
      }
      hasMore = subs.has_more;
      if (subs.data.length) startingAfter = subs.data[subs.data.length - 1].id;
    }
  }
  totalEarnings = Math.round(totalEarnings * 100) / 100;

  if (DATABASE_ID && ACCOUNTS_COLLECTION_ID) {
    const client = new sdk.Client()
      .setEndpoint(APPWRITE_ENDPOINT)
      .setProject(APPWRITE_PROJECT_ID)
      .setKey(APPWRITE_API_KEY);
    const databases = new sdk.Databases(client);
    for (const s of subscribers) {
      try {
        const accs = await databases.listDocuments(DATABASE_ID, ACCOUNTS_COLLECTION_ID, [
          sdk.Query.equal("stripe_customer_id", s.customerId),
          sdk.Query.limit(1),
        ]);
        if (accs.documents?.length) {
          s.userId = accs.documents[0].user_id || null;
        }
      } catch {}
    }
  }

  return res.json({
    success: true,
    plan,
    stats: {
      totalSubscriptions,
      subscriptionsMonthly,
      subscriptionsYearly,
      totalEarnings,
      upgradedTo: 0,
      downgradedTo: 0,
      downgradedFrom: 0,
    },
    subscribers,
  });
}

async function handleCreatePrice(req, res, log, error) {
  if (!(await ensureAdmin(req))) {
    return res.json({ success: false, message: "Admin access required" }, 403);
  }
  const STRIPE_SECRET_KEY = req.variables?.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY;
  const payload = parsePayload(req);
  const productId = payload.product_id || payload.productId;
  const interval = payload.interval || "month";
  const amount = parseFloat(payload.amount);
  const currency = payload.currency || "eur";
  if (!productId || isNaN(amount) || amount < 0) {
    return res.json({ success: false, message: "product_id and amount (>=0) are required" }, 400);
  }
  const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" });
  const product = await stripe.products.retrieve(productId);
  const label = product.metadata?.label || product.name?.toLowerCase().replace(/\s+/g, "_") || "plan";
  const price = await stripe.prices.create({
    product: productId,
    unit_amount: Math.round(amount * 100),
    currency: currency.toLowerCase(),
    recurring: { interval: interval === "year" ? "year" : "month", interval_count: 1 },
    metadata: { label, billing_period: interval === "year" ? "yearly" : "monthly" },
  });
  log("Created price " + price.id + " for product " + productId);
  return res.json({
    success: true,
    priceId: price.id,
    amount: price.unit_amount / 100,
    interval: price.recurring?.interval || interval,
  });
}

async function handleSetActive(req, res, log, error) {
  if (!(await ensureAdmin(req))) {
    return res.json({ success: false, message: "Admin access required" }, 403);
  }
  const STRIPE_SECRET_KEY = req.variables?.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY;
  const payload = parsePayload(req);
  const productId = payload.product_id || payload.productId;
  const active = payload.active !== false && payload.active !== "false";
  if (!productId) {
    return res.json({ success: false, message: "product_id is required" }, 400);
  }
  const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" });
  await stripe.products.update(productId, { active });
  log("Product " + productId + " active=" + active);
  return res.json({ success: true, productId, active });
}

async function handleSetPriceActive(req, res, log, error) {
  if (!(await ensureAdmin(req))) {
    return res.json({ success: false, message: "Admin access required" }, 403);
  }
  const STRIPE_SECRET_KEY = req.variables?.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY;
  const payload = parsePayload(req);
  const priceId = payload.price_id || payload.priceId;
  const active = payload.active !== false && payload.active !== "false";
  if (!priceId) {
    return res.json({ success: false, message: "price_id is required" }, 400);
  }
  const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" });
  await stripe.prices.update(priceId, { active });
  log("Price " + priceId + " active=" + active);
  return res.json({ success: true, priceId, active });
}

module.exports = async ({ req, res, log, error }) => {
  const _m = (req.method || "POST").toString().toUpperCase();
  const _p = (req.path || req.url || "").split("?")[0];
  if (_m === "POST" && typeof _p === "string" && _p.includes("errors/not-found")) {
    return res.json({ success: true }, 200);
  }

  try {
    const payload = parsePayload(req);
    const actionRaw = (req.query?.action || payload.action || "list").toString().toLowerCase();
    const actionMap = {
      list: "list",
      "list-products": "list",
      create: "create",
      update: "update",
      get: "get",
      "set-active": "set-active",
      "set-price-active": "set-price-active",
      "create-price": "create-price",
      "delete-plan": "delete-plan",
    };
    const action = actionMap[actionRaw] || actionRaw;

    if (action === "list") {
      return await handleListProducts(req, res, log, error);
    }
    if (action === "create") {
      return await handleCreate(req, res, log, error);
    }
    if (action === "update") {
      return await handleUpdate(req, res, log, error);
    }
    if (action === "get") {
      return await handleGet(req, res, log, error);
    }
    if (action === "set-active") {
      return await handleSetActive(req, res, log, error);
    }
    if (action === "set-price-active") {
      return await handleSetPriceActive(req, res, log, error);
    }
    if (action === "create-price") {
      return await handleCreatePrice(req, res, log, error);
    }
    if (action === "delete-plan") {
      return handleDeletePlan({ req, res, log, error });
    }

    return res.json({
      success: false,
      message:
        'Invalid action. Use "list", "create", "update", "get", "set-active", "set-price-active", "create-price", or "delete-plan".',
    }, 400);
  } catch (err) {
    error("stripe-products failed: " + err.message);
    return res.json({ success: false, message: err.message, plans: [] }, 500);
  }
};
