const sdk = require("node-appwrite");

const DEFAULT_DB = "platform_db";
const DEFAULT_ACCOUNTS = "accounts";
const USER_BATCH = 100;
/** Safety cap on user rows scanned when plan filter is active (avoids timeouts). */
const MAX_USER_ROWS_SCAN = 10000;

function norm(s, allowed, fallback) {
  const v = typeof s === "string" ? s.trim().toLowerCase() : "";
  return allowed.includes(v) ? v : fallback;
}

/**
 * Load map userId -> hasStripeCustomer (truthy stripe_customer_id on account doc).
 */
async function buildStripeMap(databases, log) {
  const dbId = process.env.PLATFORM_DATABASE_ID || DEFAULT_DB;
  const collId = process.env.ACCOUNTS_COLLECTION_ID || DEFAULT_ACCOUNTS;
  const map = new Map();
  let cursor = null;
  let pages = 0;
  /** Cap account pages read per request (100 docs/page). Lower = faster; plan filter may be incomplete if huge. */
  const maxPages = Number(process.env.ADMIN_LIST_STRIPE_MAP_MAX_PAGES || 120);

  while (pages < maxPages) {
    const queries = [sdk.Query.limit(100)];
    if (cursor) queries.push(sdk.Query.cursorAfter(cursor));
    let res;
    try {
      res = await databases.listDocuments(dbId, collId, queries);
    } catch (e) {
      log(`admin list: accounts load failed (${e.message}), plan filter may be inaccurate`);
      return map;
    }
    const docs = res.documents || [];
    for (const doc of docs) {
      const uid = doc.user_id;
      if (!uid) continue;
      const sid = doc.stripe_customer_id;
      const has = !!(sid && String(sid).trim());
      map.set(uid, has);
    }
    pages += 1;
    if (docs.length < 100) break;
    cursor = docs[docs.length - 1].$id;
  }
  return map;
}

function buildUserFilters(payload) {
  const status = norm(payload.status, ["all", "active", "inactive"], "all");
  const role = norm(payload.role, ["all", "admin", "user"], "all");
  const q = [];
  if (status === "active") q.push(sdk.Query.equal("status", true));
  if (status === "inactive") q.push(sdk.Query.equal("status", false));
  if (role === "admin") {
    q.push(sdk.Query.containsAny("labels", ["admin", "Admin"]));
  }
  if (role === "user") {
    q.push(sdk.Query.notContains("labels", "admin"));
  }
  return q;
}

function matchesPlan(userId, plan, stripeMap) {
  if (plan === "all") return true;
  const hasStripe = stripeMap.get(userId) === true;
  if (plan === "stripe") return hasStripe;
  if (plan === "free") return !hasStripe;
  return true;
}

module.exports = async function handleList({ req, res, log }, { client, databases }) {
  const payload = req._parsedPayload || {};
  const limit = Number.isFinite(Number(payload.limit))
    ? Math.max(1, Math.min(100, Number(payload.limit)))
    : 100;
  const offset = Number.isFinite(Number(payload.offset))
    ? Math.max(0, Number(payload.offset))
    : 0;
  const search = typeof payload.search === "string" ? payload.search.trim() : "";
  const plan = norm(payload.plan, ["all", "free", "stripe"], "all");

  const userFilters = buildUserFilters(payload);
  const users = new sdk.Users(client);

  log(
    `Listing users: limit=${limit}, offset=${offset}, search=${search || "none"}, plan=${plan}, filters=${userFilters.length}`,
  );

  if (plan === "all") {
    const queries = [...userFilters, sdk.Query.limit(limit), sdk.Query.offset(offset)];
    let response;
    try {
      response = await users.list({
        queries,
        search: search || undefined,
      });
    } catch (e) {
      log(`admin list: users.list failed (${e.message})`);
      return res.json(
        { success: false, message: e.message || "Failed to list users", users: [], total: 0, limit, offset },
        500,
      );
    }
    const rawUsers = response.users || response.documents || [];
    return res.json({
      success: true,
      users: rawUsers,
      total: response.total ?? rawUsers.length,
      limit,
      offset,
    });
  }

  const stripeMap = await buildStripeMap(databases, log);
  const pool = [];
  let scanOffset = 0;

  while (scanOffset < MAX_USER_ROWS_SCAN) {
    const queries = [
      ...userFilters,
      sdk.Query.orderDesc("registration"),
      sdk.Query.limit(USER_BATCH),
      sdk.Query.offset(scanOffset),
    ];
    let response;
    try {
      response = await users.list({
        queries,
        search: search || undefined,
      });
    } catch (e) {
      log(`admin list: users.list batch failed at offset ${scanOffset} (${e.message})`);
      return res.json(
        {
          success: false,
          message: e.message || "Failed to list users",
          users: [],
          total: 0,
          limit,
          offset,
        },
        500,
      );
    }
    const batch = response.users || response.documents || [];
    if (!batch.length) break;
    for (const u of batch) {
      if (matchesPlan(u.$id, plan, stripeMap)) pool.push(u);
    }
    scanOffset += batch.length;
    if (batch.length < USER_BATCH) break;
  }

  if (scanOffset >= MAX_USER_ROWS_SCAN) {
    log(`admin list: hit MAX_USER_ROWS_SCAN=${MAX_USER_ROWS_SCAN}; total may be incomplete`);
  }

  const total = pool.length;
  const pageUsers = pool.slice(offset, offset + limit);

  return res.json({
    success: true,
    users: pageUsers,
    total,
    limit,
    offset,
  });
};
