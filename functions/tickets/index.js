/**
 * Tickets / Helpdesk function: list, create, get, add message, admin update
 * Actions: list, create, get, addMessage, updateStatus (admin)
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
const TICKETS_COLLECTION = "tickets";
const MESSAGES_COLLECTION = "ticket_messages";

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
  const users = new sdk.Users(client);
  const userId = req.headers["x-appwrite-user-id"] || process.env.APPWRITE_FUNCTION_USER_ID;

  const payload = parsePayload(req);
  const action = payload.action || "list";

  try {
    const isAdmin = await checkAdmin(teams, users, userId);

    if (action === "list") {
      if (!userId) return fail(res, "Unauthorized", 401);
      const queries = [sdk.Query.equal("user_id", userId), sdk.Query.orderDesc("$updatedAt"), sdk.Query.limit(50)];
      const result = await databases.listDocuments(DATABASE_ID, TICKETS_COLLECTION, queries);
      return ok(res, { tickets: result.documents, total: result.total });
    }

    if (action === "adminList") {
      if (!isAdmin) return fail(res, "Admin required", 403);
      const result = await databases.listDocuments(DATABASE_ID, TICKETS_COLLECTION, [
        sdk.Query.orderDesc("$updatedAt"),
        sdk.Query.limit(100),
      ]);
      return ok(res, { tickets: result.documents, total: result.total });
    }

    if (action === "create") {
      if (!userId) return fail(res, "Unauthorized", 401);
      const { subject, priority, category, siteId, targetUserId } = payload;
      if (!subject || !subject.trim()) return fail(res, "Subject required", 400);

      let ownerId = userId;
      if (targetUserId && String(targetUserId).trim()) {
        if (!isAdmin) return fail(res, "Forbidden", 403);
        ownerId = String(targetUserId).trim();
      }

      const ticket = await databases.createDocument(DATABASE_ID, TICKETS_COLLECTION, sdk.ID.unique(), {
        user_id: ownerId,
        subject: subject.trim(),
        status: "open",
        priority: priority || "medium",
        category: category || null,
        site_id: siteId || null,
      });

      const { body } = payload;
      if (body && body.trim()) {
        await databases.createDocument(DATABASE_ID, MESSAGES_COLLECTION, sdk.ID.unique(), {
          ticket_id: ticket.$id,
          user_id: ownerId,
          body: body.trim(),
          is_staff: false,
        });
      }

      return ok(res, { ticket, success: true });
    }

    if (action === "get") {
      if (!userId) return fail(res, "Unauthorized", 401);
      const { ticketId } = payload;
      if (!ticketId) return fail(res, "Missing ticketId", 400);

      const ticket = await databases.getDocument(DATABASE_ID, TICKETS_COLLECTION, ticketId);
      if (ticket.user_id !== userId && !isAdmin) return fail(res, "Forbidden", 403);

      const messages = await databases.listDocuments(DATABASE_ID, MESSAGES_COLLECTION, [
        sdk.Query.equal("ticket_id", ticketId),
        sdk.Query.orderAsc("$createdAt"),
      ]);

      return ok(res, { ticket, messages: messages.documents });
    }

    if (action === "addMessage") {
      if (!userId) return fail(res, "Unauthorized", 401);
      const { ticketId, body } = payload;
      if (!ticketId || !body || !body.trim()) return fail(res, "Missing ticketId or body", 400);

      const ticket = await databases.getDocument(DATABASE_ID, TICKETS_COLLECTION, ticketId);
      if (ticket.user_id !== userId && !isAdmin) return fail(res, "Forbidden", 403);

      await databases.createDocument(DATABASE_ID, MESSAGES_COLLECTION, sdk.ID.unique(), {
        ticket_id: ticketId,
        user_id: userId,
        body: body.trim(),
        is_staff: isAdmin,
      });

      await databases.updateDocument(DATABASE_ID, TICKETS_COLLECTION, ticketId, { $updatedAt: new Date().toISOString() });
      return ok(res, { success: true });
    }

    if (action === "updateStatus") {
      if (!isAdmin) return fail(res, "Admin required", 403);
      const { ticketId, status } = payload;
      if (!ticketId || !status) return fail(res, "Missing ticketId or status", 400);
      const valid = ["open", "in_progress", "waiting", "resolved", "closed"];
      if (!valid.includes(status)) return fail(res, "Invalid status", 400);

      await databases.updateDocument(DATABASE_ID, TICKETS_COLLECTION, ticketId, { status });
      return ok(res, { success: true });
    }

    return fail(res, "Unknown action: " + action, 400);
  } catch (e) {
    error(e.message);
    return fail(res, e.message || "Internal error", 500);
  }
};

async function checkAdmin(teams, users, userId) {
  if (!userId) return false;
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
