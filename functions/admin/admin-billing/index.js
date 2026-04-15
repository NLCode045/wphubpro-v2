const Stripe = require("stripe");
const sdk = require("node-appwrite");
const { hasAppwriteBootstrap } = require("../../subscriptions/stripe-consumer/lib/appwriteEnv");
const { createServerClientAndDatabases } = require("../../database/fetchAppwriteCredentialsFromGateway");

function parsePayload(req) {
  if (!req) return {};
  if (req.body && typeof req.body === "object") return req.body;
  if (req.bodyRaw && typeof req.bodyRaw === "string") {
    try {
      return JSON.parse(req.bodyRaw);
    } catch {
      return {};
    }
  }
  if (req.payload && typeof req.payload === "string") {
    try {
      return JSON.parse(req.payload);
    } catch {
      return {};
    }
  }
  if (req.payload && typeof req.payload === "object") return req.payload;
  return req.query || {};
}

function ok(res, payload = {}, statusCode = 200) {
  return res.json(payload, statusCode);
}

function fail(res, message, statusCode = 500, extra = {}) {
  return res.json({ success: false, message, ...extra }, statusCode);
}

async function ensureAdmin(req) {
  const userId = process.env.APPWRITE_FUNCTION_USER_ID || req.headers?.["x-appwrite-user-id"];
  if (!userId || !hasAppwriteBootstrap()) return false;
  let teams;
  let users;
  try {
    ({ teams, users } = await createServerClientAndDatabases(null, null));
  } catch {
    return false;
  }
  try {
    const memberships = await teams.listMemberships("admin");
    if (memberships.memberships.some((m) => m.userId === userId)) return true;
  } catch {}
  try {
    const user = await users.get(userId);
    if (user.labels?.some((l) => String(l).toLowerCase() === "admin" || String(l).toLowerCase() === "administrator"))
      return true;
  } catch {}
  return false;
}

function stripeCustomerId(subscription) {
  const c = subscription.customer;
  return typeof c === "string" ? c : c?.id;
}

function customerEmailFromStripe(subscription) {
  const c = subscription.customer;
  if (typeof c === "object" && c?.email) return c.email;
  return null;
}

/**
 * Plan label for admin subscription list rows.
 * Do not use list expand `data.items.data.price` — Stripe still treats `price.product` as a 5th level and errors.
 * Only `data.customer` is expanded on list; resolve price/product via prices.retrieve (allowed depth) with cache.
 */
async function planLabelForSubscriptionList(sub, stripe, priceLabelCache) {
  const item = sub.items?.data?.[0];
  if (!item) return "—";

  const priceField = item.price;
  if (typeof priceField === "object" && priceField) {
    const price = priceField;
    if (price.nickname) return price.nickname;
    if (typeof price.product === "object" && price.product?.name) return price.product.name;
    const pid = typeof price.product === "string" ? price.product : null;
    if (pid) {
      if (priceLabelCache.has("p:" + pid)) return priceLabelCache.get("p:" + pid) || price.id || "—";
      try {
        const p = await stripe.products.retrieve(pid);
        const name = p.name || price.id || "—";
        priceLabelCache.set("p:" + pid, name);
        return name;
      } catch {
        priceLabelCache.set("p:" + pid, null);
        return price.id || "—";
      }
    }
    return price.id || "—";
  }

  const priceId = typeof priceField === "string" ? priceField : null;
  if (!priceId) return "—";
  if (priceLabelCache.has("pr:" + priceId)) {
    const c = priceLabelCache.get("pr:" + priceId);
    return c != null ? c : priceId;
  }
  try {
    const price = await stripe.prices.retrieve(priceId, { expand: ["product"] });
    let label = price.nickname || null;
    if (!label && typeof price.product === "object" && price.product?.name) label = price.product.name;
    if (!label && typeof price.product === "string") {
      try {
        const p = await stripe.products.retrieve(price.product);
        label = p.name || null;
      } catch {
        label = null;
      }
    }
    if (!label) label = price.id;
    priceLabelCache.set("pr:" + priceId, label);
    return label;
  } catch {
    priceLabelCache.set("pr:" + priceId, null);
    return priceId;
  }
}

function stripeObjectToJson(obj) {
  if (obj == null) return null;
  if (typeof obj.toJSON === "function") return obj.toJSON();
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch {
    return obj;
  }
}

module.exports = async ({ req, res, log, error }) => {
  const payload = parsePayload(req);
  const action = payload.action || "";

  if (!(await ensureAdmin(req))) {
    return fail(res, "Admin access required", 403);
  }

  const STRIPE_SECRET_KEY = req.variables?.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY;
  if (!STRIPE_SECRET_KEY) {
    return fail(res, "Stripe configuration missing", 500);
  }

  const DATABASE_ID =
    req.variables?.APPWRITE_DATABASE_ID ||
    process.env.APPWRITE_DATABASE_ID ||
    process.env.DATABASE_ID ||
    "platform_db";
  const ACCOUNTS_COLLECTION_ID =
    req.variables?.APPWRITE_ACCOUNTS_COLLECTION_ID ||
    process.env.APPWRITE_ACCOUNTS_COLLECTION_ID ||
    process.env.ACCOUNTS_COLLECTION_ID ||
    "accounts";
  const SITES_COLLECTION = process.env.SITES_COLLECTION_ID || "sites";
  const LIBRARY_COLLECTION = process.env.LIBRARY_COLLECTION_ID || "library";

  const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" });

  let databases;
  let usersApi;
  try {
    ({ databases, users: usersApi } = await createServerClientAndDatabases(log, error));
  } catch (e) {
    error(e.message);
    return fail(res, "Appwrite credentials unavailable", 500);
  }

  async function appwriteUserByStripeCustomerId(customerId) {
    if (!customerId) return null;
    try {
      const accs = await databases.listDocuments(DATABASE_ID, ACCOUNTS_COLLECTION_ID, [
        sdk.Query.equal("stripe_customer_id", customerId),
        sdk.Query.limit(1),
      ]);
      const doc = accs.documents[0];
      if (!doc?.user_id) return null;
      const u = await usersApi.get(doc.user_id);
      return {
        id: u.$id,
        name: u.name || "",
        email: u.email || "",
      };
    } catch (e) {
      log?.("appwriteUserByStripeCustomerId: " + e.message);
      return null;
    }
  }

  try {
    if (action === "subscriptions-list") {
      // List API allows only 4 expand levels; `data.items.data.price` still implies `price.product` → error.
      // Expand customers only; plan labels use prices.retrieve (see planLabelForSubscriptionList).
      const list = await stripe.subscriptions.list({
        limit: 50,
        status: "all",
        expand: ["data.customer"],
      });

      const priceLabelCache = new Map();
      const rows = [];
      for (const sub of list.data) {
        const cid = stripeCustomerId(sub);
        const email = customerEmailFromStripe(sub) || "";
        const appwriteUser = cid ? await appwriteUserByStripeCustomerId(cid) : null;
        rows.push({
          subscriptionId: sub.id,
          status: sub.status,
          cancelAtPeriodEnd: sub.cancel_at_period_end,
          currentPeriodEnd: sub.current_period_end,
          currentPeriodStart: sub.current_period_start,
          customerId: cid,
          customerEmail: email,
          planLabel: await planLabelForSubscriptionList(sub, stripe, priceLabelCache),
          appwriteUser,
        });
      }

      return ok(res, { subscriptions: rows, hasMore: list.has_more });
    }

    if (action === "subscription-detail") {
      const { subscriptionId } = payload;
      if (!subscriptionId) return fail(res, "subscriptionId is required", 400);

      const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
        expand: ["latest_invoice", "customer", "default_payment_method", "items.data.price"],
      });

      const customerId = stripeCustomerId(subscription);
      const invoices = await stripe.invoices.list({
        subscription: subscriptionId,
        limit: 20,
      });

      let appwriteUser = null;
      let accountDoc = null;
      if (customerId) {
        try {
          const accs = await databases.listDocuments(DATABASE_ID, ACCOUNTS_COLLECTION_ID, [
            sdk.Query.equal("stripe_customer_id", customerId),
            sdk.Query.limit(1),
          ]);
          accountDoc = accs.documents[0] || null;
          if (accountDoc?.user_id) {
            const u = await usersApi.get(accountDoc.user_id);
            appwriteUser = {
              id: u.$id,
              name: u.name || "",
              email: u.email || "",
            };
          }
        } catch (e) {
          error?.(e.message);
        }
      }

      let usage = { sitesUsed: 0, libraryUsed: 0, storageUsed: 0 };
      const uid = accountDoc?.user_id;
      if (uid) {
        try {
          const sitesRes = await databases.listDocuments(DATABASE_ID, SITES_COLLECTION, [
            sdk.Query.equal("user_id", uid),
            sdk.Query.limit(5000),
          ]);
          usage.sitesUsed = sitesRes.total;

          const libRes = await databases.listDocuments(DATABASE_ID, LIBRARY_COLLECTION, [
            sdk.Query.equal("user_id", uid),
            sdk.Query.limit(5000),
          ]);
          usage.libraryUsed = libRes.total;
          const docs = libRes.documents || [];
          usage.storageUsed = docs.filter((d) => d.source === "local").length;
        } catch (e) {
          log?.("usage count: " + e.message);
        }
      }

      return ok(res, {
        subscription: stripeObjectToJson(subscription),
        invoices: invoices.data.map((inv) => stripeObjectToJson(inv)),
        appwriteUser,
        account: accountDoc ? { $id: accountDoc.$id, user_id: accountDoc.user_id } : null,
        usage,
      });
    }

    if (action === "payment-intents-list") {
      const startingAfter = payload.startingAfter || undefined;
      const list = await stripe.paymentIntents.list({
        limit: 100,
        starting_after: startingAfter || undefined,
        expand: ["data.customer"],
      });

      const paymentIntents = list.data.map((pi) => {
        const cust = pi.customer;
        const customerId = typeof cust === "string" ? cust : cust?.id;
        const customerEmail =
          typeof cust === "object" && cust?.email ? cust.email : null;
        return {
          id: pi.id,
          amount: pi.amount,
          currency: pi.currency,
          status: pi.status,
          description: pi.description || null,
          created: pi.created,
          customerId,
          customerEmail,
        };
      });

      return ok(res, {
        paymentIntents,
        hasMore: list.has_more,
      });
    }

    return fail(res, "Unknown action: " + action, 400);
  } catch (e) {
    error?.(e.message);
    return fail(res, e.message || "Internal error", 500);
  }
};
