/**
 * Notifications function: list, mark read, admin send
 * Actions: list, markRead, markAllRead, send (admin)
 */
const sdk = require("node-appwrite");

function parsePayload(req) {
  if (!req) return {};
  if (req.body && typeof req.body === "object") return req.body;
  if (req.payload && typeof req.payload === "object") return req.payload;
  const raw = req.payload || req.bodyRaw || req.body;
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return {};
    return JSON.parse(trimmed);
  }
  return {};
}

function createClient(sdkLib, { endpoint, projectId, apiKey }) {
  const client = new sdkLib.Client().setEndpoint(endpoint).setProject(projectId);
  if (apiKey) client.setKey(apiKey);
  return client;
}

function ok(res, payload = {}, statusCode = 200) {
  return res.json(payload, statusCode);
}

function fail(res, message, statusCode = 500, extra = {}) {
  return res.json({ success: false, message, ...extra }, statusCode);
}

const DATABASE_ID = "platform_db";
const COLLECTION_ID = "notifications";

module.exports = async ({ req, res, log, error }) => {
  const endpoint = process.env.APPWRITE_ENDPOINT || process.env.APPWRITE_FUNCTION_ENDPOINT;
  const projectId = process.env.APPWRITE_PROJECT_ID || process.env.APPWRITE_FUNCTION_PROJECT_ID;
  const apiKey = process.env.APPWRITE_API_KEY || process.env.APPWRITE_FUNCTION_API_KEY || process.env.APPWRITE_KEY;
  if (!endpoint || !projectId || !apiKey) {
    return fail(res, "Function environment not configured", 500);
  }

  const client = createClient(sdk, { endpoint, projectId, apiKey });
  const databases = new sdk.Databases(client);
  const teams = new sdk.Teams(client);
  const userId = req.headers["x-appwrite-user-id"] || process.env.APPWRITE_FUNCTION_USER_ID;

  const payload = parsePayload(req);
  const action = payload.action || "list";

  try {
    const isAdmin = await checkAdmin(teams, userId);

    if (action === "list") {
      if (!userId) return fail(res, "Unauthorized", 401);
      const limit = Math.min(parseInt(payload.limit, 10) || 50, 100);
      const offset = parseInt(payload.offset, 10) || 0;
      const unreadOnly = payload.unreadOnly === true || payload.unreadOnly === "true";

      const queries = [sdk.Query.equal("user_id", userId), sdk.Query.orderDesc("$createdAt"), sdk.Query.limit(limit), sdk.Query.offset(offset)];
      if (unreadOnly) queries.unshift(sdk.Query.equal("read", false));

      const result = await databases.listDocuments(DATABASE_ID, COLLECTION_ID, queries);
      return ok(res, { notifications: result.documents, total: result.total });
    }

    if (action === "markRead") {
      if (!userId) return fail(res, "Unauthorized", 401);
      const { notificationId } = payload;
      if (!notificationId) return fail(res, "Missing notificationId", 400);

      const doc = await databases.getDocument(DATABASE_ID, COLLECTION_ID, notificationId);
      if (doc.user_id !== userId) return fail(res, "Forbidden", 403);

      await databases.updateDocument(DATABASE_ID, COLLECTION_ID, notificationId, { read: true });
      return ok(res, { success: true });
    }

    if (action === "markAllRead") {
      if (!userId) return fail(res, "Unauthorized", 401);
      const result = await databases.listDocuments(DATABASE_ID, COLLECTION_ID, [sdk.Query.equal("user_id", userId), sdk.Query.equal("read", false)]);
      for (const doc of result.documents) {
        await databases.updateDocument(DATABASE_ID, COLLECTION_ID, doc.$id, { read: true });
      }
      return ok(res, { success: true, count: result.total });
    }

    if (action === "send") {
      if (!isAdmin) return fail(res, "Admin required", 403);
      const { title, body, type, targetUserIds, meta } = payload;
      if (!title || !body || !type) return fail(res, "Missing title, body, or type", 400);

      const targetUsers = targetUserIds && Array.isArray(targetUserIds) && targetUserIds.length > 0 ? targetUserIds : null;
      if (!targetUsers) return fail(res, "targetUserIds required (array of user IDs, or [] for all)", 400);

      let userIdsToNotify = targetUsers;
      if (targetUsers.length === 0) {
        const usersApi = new sdk.Users(client);
        const list = await usersApi.list();
        userIdsToNotify = list.users.map((u) => u.$id);
      }

      const created = [];
      for (const uid of userIdsToNotify) {
        const doc = await databases.createDocument(DATABASE_ID, COLLECTION_ID, sdk.ID.unique(), {
          user_id: uid,
          type,
          title,
          body,
          read: false,
          meta: meta ? JSON.stringify(meta) : null,
        });
        created.push(doc.$id);
      }
      return ok(res, { success: true, count: created.length, ids: created });
    }

    return fail(res, "Unknown action: " + action, 400);
  } catch (e) {
    error(e.message);
    return fail(res, e.message || "Internal error", 500);
  }
};

async function checkAdmin(teams, userId) {
  if (!userId) return false;
  try {
    const memberships = await teams.listMemberships("admin");
    return memberships.memberships.some((m) => m.userId === userId);
  } catch {
    return false;
  }
}
