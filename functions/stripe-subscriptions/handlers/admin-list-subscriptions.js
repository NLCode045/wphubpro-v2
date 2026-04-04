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

async function resolveCustomerLabels(
  client,
  databases,
  DATABASE_ID,
  ACCOUNTS_COLLECTION_ID,
  users,
  customerId
) {
  try {
    const accs = await databases.listDocuments(DATABASE_ID, ACCOUNTS_COLLECTION_ID, [
      sdk.Query.equal("stripe_customer_id", customerId),
      sdk.Query.limit(1),
    ]);
    if (!accs.documents?.length) {
      return { userId: null, username: null };
    }
    const userId = accs.documents[0].user_id;
    if (!userId) return { userId: null, username: null };
    try {
      const u = await users.get(userId);
      return {
        userId,
        username: u.name || u.email || u.$id,
      };
    } catch {
      return { userId, username: null };
    }
  } catch {
    return { userId: null, username: null };
  }
}

module.exports = async ({ req, res, log, error, payload: payloadFromIndex }) => {
  const STRIPE_SECRET_KEY =
    req.variables?.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY;
  const APPWRITE_ENDPOINT = req.variables?.APPWRITE_ENDPOINT || process.env.APPWRITE_ENDPOINT;
  const APPWRITE_PROJECT_ID = req.variables?.APPWRITE_PROJECT_ID || process.env.APPWRITE_PROJECT_ID;
  const APPWRITE_API_KEY = req.variables?.APPWRITE_API_KEY || process.env.APPWRITE_API_KEY;
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
    return res.json({ success: false, error: "Missing STRIPE_SECRET_KEY", subscriptions: [] }, 500);
  }

  if (!(await ensureAdmin(req))) {
    return res.json({ success: false, error: "Admin access required", subscriptions: [] }, 403);
  }

  const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" });
  const payload = parsePayload(req, payloadFromIndex);

  const statusFilter = payload.status && payload.status !== "all" ? String(payload.status) : undefined;
  const priceIdFilter = payload.priceId ? String(payload.priceId) : undefined;
  const productIdFilter = payload.productId ? String(payload.productId) : undefined;
  const search = (payload.search && String(payload.search).trim().toLowerCase()) || "";
  const sortField = payload.sortField ? String(payload.sortField) : "startDate";
  const sortDir = payload.sortDir === "desc" ? "desc" : "asc";
  const maxPages = Math.min(Math.max(parseInt(payload.maxPages, 10) || 3, 1), 10);
  const limit = Math.min(Math.max(parseInt(payload.limit, 10) || 100, 1), 100);

  try {
    const listParams = {
      limit,
      expand: ["data.customer", "data.items.data.price"],
    };
    if (statusFilter) listParams.status = statusFilter;
    if (priceIdFilter) listParams.price = priceIdFilter;

    const allRows = [];
    /** Product IDs we need names for (Stripe allows max 4 expand levels; `data.items.data.price.product` is one too deep). */
    const productIdsForNames = new Set();
    let startingAfter = null;
    let pages = 0;

    while (pages < maxPages) {
      const p = { ...listParams };
      if (startingAfter) p.starting_after = startingAfter;
      const batch = await stripe.subscriptions.list(p);
      pages += 1;
      for (const sub of batch.data) {
        const item = sub.items?.data?.[0];
        const price = item?.price;
        const productRef = price?.product;
        const product =
          typeof productRef === "object" && productRef
            ? productRef
            : null;
        const productId = product?.id || (typeof productRef === "string" ? productRef : null);
        const planNameFromExpand = product?.name || null;

        if (productIdFilter && productId !== productIdFilter) continue;

        if (productId && planNameFromExpand == null) {
          productIdsForNames.add(productId);
        }

        const customerId =
          typeof sub.customer === "string" ? sub.customer : sub.customer?.id || null;

        allRows.push({
          raw: sub,
          subscriptionId: sub.id,
          status: sub.status,
          startDate: sub.start_date,
          endDate: sub.ended_at || sub.canceled_at || null,
          currentPeriodEnd: sub.current_period_end,
          nextBillingDate: sub.current_period_end,
          billingCycle: price?.recurring?.interval || null,
          billingIntervalCount: price?.recurring?.interval_count || 1,
          planName: planNameFromExpand,
          priceId: price?.id || null,
          productId,
          customerId,
          customerEmail:
            typeof sub.customer === "object" && sub.customer ? sub.customer.email || null : null,
          customerName:
            typeof sub.customer === "object" && sub.customer ? sub.customer.name || null : null,
          cancelAtPeriodEnd: sub.cancel_at_period_end,
          hubArchived: sub.metadata?.hub_archived === "true",
        });
      }
      if (!batch.has_more || !batch.data.length) break;
      startingAfter = batch.data[batch.data.length - 1].id;
    }

    const productNameById = {};
    if (productIdsForNames.size > 0) {
      await Promise.all(
        [...productIdsForNames].map(async (pid) => {
          try {
            const pr = await stripe.products.retrieve(pid);
            productNameById[pid] = pr.name || null;
          } catch {
            productNameById[pid] = null;
          }
        })
      );
    }
    for (const row of allRows) {
      if (row.planName == null && row.productId != null && Object.prototype.hasOwnProperty.call(productNameById, row.productId)) {
        row.planName = productNameById[row.productId];
      }
    }

    let client = null;
    let databases = null;
    let users = null;
    if (APPWRITE_ENDPOINT && APPWRITE_PROJECT_ID && APPWRITE_API_KEY) {
      client = new sdk.Client()
        .setEndpoint(APPWRITE_ENDPOINT)
        .setProject(APPWRITE_PROJECT_ID)
        .setKey(APPWRITE_API_KEY);
      databases = new sdk.Databases(client);
      users = new sdk.Users(client);
    }

    const customerIds = [...new Set(allRows.map((r) => r.customerId).filter(Boolean))];
    const customerMap = {};
    if (databases && users) {
      for (const cid of customerIds) {
        customerMap[cid] = await resolveCustomerLabels(
          client,
          databases,
          DATABASE_ID,
          ACCOUNTS_COLLECTION_ID,
          users,
          cid
        );
      }
    }

    let filtered = allRows.map((row) => {
      const u = row.customerId ? customerMap[row.customerId] : null;
      return {
        ...row,
        userId: u?.userId || null,
        username: u?.username || null,
      };
    });

    if (search) {
      filtered = filtered.filter((row) => {
        const sid = row.subscriptionId.toLowerCase();
        const un = (row.username || "").toLowerCase();
        const uid = (row.userId || "").toLowerCase();
        const email = (row.customerEmail || "").toLowerCase();
        const name = (row.customerName || "").toLowerCase();
        return (
          sid.includes(search) ||
          un.includes(search) ||
          uid.includes(search) ||
          email.includes(search) ||
          name.includes(search)
        );
      });
    }

    const sortKey = (row) => {
      switch (sortField) {
        case "endDate":
          return row.endDate || row.currentPeriodEnd || 0;
        case "nextBillingDate":
          return row.nextBillingDate || 0;
        case "billingCycle":
          return row.billingCycle || "";
        case "plan":
          return row.planName || "";
        case "status":
          return row.status || "";
        case "username":
          return row.username || "";
        case "startDate":
        default:
          return row.startDate || 0;
      }
    };

    filtered.sort((a, b) => {
      const va = sortKey(a);
      const vb = sortKey(b);
      let cmp = 0;
      if (typeof va === "number" && typeof vb === "number") cmp = va - vb;
      else cmp = String(va).localeCompare(String(vb));
      return sortDir === "desc" ? -cmp : cmp;
    });

    const subscriptions = filtered.map(({ raw, ...rest }) => {
      void raw;
      return rest;
    });

    return res.json({
      success: true,
      subscriptions,
      fetchedPages: pages,
    });
  } catch (e) {
    error("admin-list-subscriptions: " + e.message);
    return res.json({ success: false, error: e.message, subscriptions: [] }, e.statusCode || 500);
  }
};
