/**
 * Tickets / Helpdesk: list, admin list, create, get, messages, status, assignment, follow, notifications.
 */
const sdk = require("node-appwrite");
const { hasAppwriteBootstrap } = require("../../subscriptions/stripe-consumer/lib/appwriteEnv");
const { createServerClientAndDatabases } = require("../../database/fetchAppwriteCredentialsFromGateway");

const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || "platform_db";
const TICKETS_COLLECTION = "tickets";
const MESSAGES_COLLECTION = "ticket_messages";
const ACTIVITIES_COLLECTION = "ticket_activities";
const NOTIFICATIONS_COLLECTION = "notifications";

const VALID_CATEGORIES = new Set(["account", "site_manager", "library", "billing", "other"]);
const VALID_STATUSES = ["open", "in_progress", "waiting", "resolved", "closed"];
const VALID_PRIORITIES = new Set(["low", "medium", "high", "urgent"]);
const VALID_NOTIFY = new Set(["platform", "email", "both"]);

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

/** Normalize Appwrite / fetch-style headers (plain object, Headers, or [{ name, value }]). */
function flattenHeaders(raw) {
  const out = {};
  if (!raw) return out;
  if (Array.isArray(raw)) {
    for (const entry of raw) {
      if (entry && typeof entry === "object" && entry.name != null) {
        out[String(entry.name).toLowerCase()] = entry.value != null ? String(entry.value) : "";
      }
    }
    return out;
  }
  if (typeof raw.forEach === "function") {
    try {
      raw.forEach((value, name) => {
        out[String(name).toLowerCase()] = String(value);
      });
      return out;
    } catch {
      /* fall through */
    }
  }
  if (typeof raw.get === "function") {
    const tryKeys = [
      "x-appwrite-user-id",
      "x-appwrite-function-user-id",
      "x-appwrite-user-jwt",
      "x-appwrite-jwt",
      "authorization",
      "x-appwrite-impersonate-user-id",
    ];
    for (const k of tryKeys) {
      try {
        const v = raw.get(k) || raw.get(k.replace(/^x-/, "X-"));
        if (v) out[k] = String(v);
      } catch {
        /* ignore */
      }
    }
    return out;
  }
  if (typeof raw === "object") {
    for (const [k, v] of Object.entries(raw)) {
      if (v != null) out[String(k).toLowerCase()] = String(v);
    }
  }
  return out;
}

function userIdFromEnvAndVariables(req) {
  const vars = req?.variables && typeof req.variables === "object" ? req.variables : {};
  const v =
    vars.APPWRITE_FUNCTION_USER_ID ||
    vars.APPWRITE_USER_ID ||
    process.env.APPWRITE_FUNCTION_USER_ID ||
    process.env.APPWRITE_USER_ID ||
    null;
  return v && String(v).trim() ? String(v).trim() : null;
}

/** Sync: headers + env (no network). */
function getExecutorUserIdSync(req) {
  const flat = flattenHeaders(req?.headers);
  const fromHeaders =
    flat["x-appwrite-user-id"] ||
    flat["x-appwrite-function-user-id"] ||
    userIdFromEnvAndVariables(req) ||
    flat["x-appwrite-impersonate-user-id"] ||
    null;
  return fromHeaders && String(fromHeaders).trim() ? String(fromHeaders).trim() : null;
}

function pickJwtFromFlatHeaders(flat) {
  const auth = flat["authorization"] || "";
  const bearer = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : auth.trim();
  const direct = flat["x-appwrite-user-jwt"] || flat["x-appwrite-jwt"] || "";
  const token = (direct && direct.trim()) || bearer || "";
  const parts = token ? token.split(".") : [];
  return parts.length === 3 && parts.every((p) => p && p.length >= 10) ? token : null;
}

/**
 * Resolves the signed-in user id for this execution (headers, env, then JWT → account.get).
 * Mirrors fetch-site-meta: some runtimes omit x-appwrite-user-id but still pass the session JWT.
 */
async function resolveExecutorUserId(req, endpoint, projectId) {
  const syncId = getExecutorUserIdSync(req);
  if (syncId) return syncId;
  const flat = flattenHeaders(req?.headers);
  const jwt = pickJwtFromFlatHeaders(flat);
  if (!jwt) return null;
  try {
    const jwtClient = new sdk.Client().setEndpoint(endpoint).setProject(projectId).setJWT(jwt);
    const account = new sdk.Account(jwtClient);
    const me = await account.get();
    return me.$id && String(me.$id).trim() ? String(me.$id).trim() : null;
  } catch {
    return null;
  }
}

function ok(res, payload = {}, statusCode = 200) {
  return res.json(payload, statusCode);
}

function fail(res, message, statusCode = 500, extra = {}) {
  return res.json({ success: false, message, ...extra }, statusCode);
}

function ticketFollowers(ticket) {
  const raw = ticket.follower_ids;
  return Array.isArray(raw) ? raw.filter(Boolean) : [];
}

function notifyRecipientIds(ticket) {
  const ids = new Set();
  if (ticket.user_id) ids.add(ticket.user_id);
  for (const id of ticketFollowers(ticket)) ids.add(id);
  const assignee = ticket.assigned_to_user_id;
  if (assignee && String(assignee).trim()) ids.add(String(assignee).trim());
  return [...ids];
}

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

async function userIsAdmin(users, teams, uid) {
  if (!uid) return false;
  return checkAdmin(teams, users, uid);
}

/**
 * Users who may receive ticket assignment (same rules as userIsAdmin): confirmed members of team "admin"
 * plus label-based admins not necessarily on that team.
 */
async function listAssignableAgents(teams, users, log) {
  const byId = new Map();
  try {
    let cursor = null;
    for (;;) {
      const queries = [sdk.Query.limit(100)];
      if (cursor) queries.push(sdk.Query.cursorAfter(cursor));
      const res = await teams.listMemberships("admin", queries);
      const list = res.memberships || [];
      for (const m of list) {
        const uid = m.userId;
        if (!uid || m.confirm === false) continue;
        if (byId.has(uid)) continue;
        byId.set(uid, await safeUserSummary(users, uid));
      }
      if (list.length < 100) break;
      cursor = list[list.length - 1].$id;
    }
  } catch (e) {
    log?.("listAgents team: " + e.message);
  }
  try {
    let ucursor = null;
    for (;;) {
      const uqueries = [
        sdk.Query.containsAny("labels", ["admin", "Admin"]),
        sdk.Query.limit(100),
        sdk.Query.orderAsc("$id"),
      ];
      if (ucursor) uqueries.push(sdk.Query.cursorAfter(ucursor));
      const ures = await users.list({ queries: uqueries });
      const batch = ures.users || ures.documents || [];
      for (const u of batch) {
        if (byId.has(u.$id)) continue;
        if (!(await userIsAdmin(users, teams, u.$id))) continue;
        byId.set(u.$id, { id: u.$id, name: u.name || "", email: u.email || "" });
      }
      if (batch.length < 100) break;
      ucursor = batch[batch.length - 1].$id;
    }
  } catch (e) {
    log?.("listAgents labels: " + e.message);
  }
  return [...byId.values()].sort((a, b) =>
    String(a.name || a.email || "").localeCompare(String(b.name || b.email || ""), undefined, {
      sensitivity: "base",
    }),
  );
}

async function safeUserSummary(users, userId) {
  if (!userId) return null;
  try {
    const u = await users.get(userId);
    return {
      id: u.$id,
      name: u.name || "",
      email: u.email || "",
    };
  } catch {
    return { id: userId, name: "", email: "" };
  }
}

async function logActivity(databases, { ticketId, actorUserId, action, summary, detail }) {
  await databases.createDocument(DATABASE_ID, ACTIVITIES_COLLECTION, sdk.ID.unique(), {
    ticket_id: ticketId,
    actor_user_id: actorUserId,
    action,
    summary,
    detail_json: detail ? JSON.stringify(detail) : null,
  });
}

async function pushTicketNotifications(databases, log, ticket, { title, body, meta, actorUserId }) {
  const channel = ticket.notify_channel || "platform";
  const recipients = notifyRecipientIds(ticket);
  const filtered = actorUserId ? recipients.filter((id) => id !== actorUserId) : recipients;
  const metaStr = meta ? JSON.stringify(meta) : JSON.stringify({ ticketId: ticket.$id });

  if (channel === "platform" || channel === "both") {
    for (const uid of filtered) {
      try {
        await databases.createDocument(DATABASE_ID, NOTIFICATIONS_COLLECTION, sdk.ID.unique(), {
          user_id: uid,
          type: "support_ticket",
          title: String(title).slice(0, 500),
          body: String(body).slice(0, 5000),
          read: false,
          meta: metaStr.slice(0, 2000),
        });
      } catch (e) {
        log?.("notify fail " + uid + ": " + e.message);
      }
    }
  }

  if (channel === "email" || channel === "both") {
    const webhook = process.env.SUPPORT_NOTIFY_EMAIL_WEBHOOK;
    if (webhook && typeof fetch === "function") {
      try {
        await fetch(webhook, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ticketId: ticket.$id,
            title,
            body,
            userIds: filtered,
          }),
        });
      } catch (e) {
        log?.("email webhook fail: " + e.message);
      }
    }
  }
}

function normalizeTicketRow(doc) {
  return {
    ...doc,
    follower_ids: ticketFollowers(doc),
  };
}

module.exports = async ({ req, res, log, error }) => {
  if (!hasAppwriteBootstrap()) {
    return fail(res, "Function environment not configured", 500);
  }

  let databases;
  let teams;
  let users;
  let endpoint;
  let projectId;
  try {
    ({ databases, teams, users, endpoint, projectId } = await createServerClientAndDatabases(log, error));
  } catch (e) {
    error(e.message);
    return fail(res, "Could not resolve Appwrite credentials", 500);
  }

  const userId = await resolveExecutorUserId(req, endpoint, projectId);

  const payload = parsePayload(req);
  const action = payload.action || "list";

  try {
    const isAdmin = await checkAdmin(teams, users, userId);

    if (action === "list") {
      if (!userId) return fail(res, "Unauthorized", 401);
      const queries = [sdk.Query.equal("user_id", userId), sdk.Query.orderDesc("$updatedAt"), sdk.Query.limit(50)];
      const result = await databases.listDocuments(DATABASE_ID, TICKETS_COLLECTION, queries);
      return ok(res, { tickets: result.documents.map(normalizeTicketRow), total: result.total });
    }

    if (action === "adminList") {
      if (!isAdmin) return fail(res, "Admin required", 403);
      const limit = Math.min(parseInt(payload.limit, 10) || 100, 200);
      const result = await databases.listDocuments(DATABASE_ID, TICKETS_COLLECTION, [
        sdk.Query.orderDesc("$updatedAt"),
        sdk.Query.limit(limit),
      ]);
      const docs = result.documents.map(normalizeTicketRow);
      const uidSet = [...new Set(docs.map((d) => d.user_id).filter(Boolean))];
      const reporterMap = {};
      await Promise.all(
        uidSet.map(async (id) => {
          reporterMap[id] = await safeUserSummary(users, id);
        }),
      );
      const tickets = docs.map((d) => ({
        ...d,
        reporter: reporterMap[d.user_id] || null,
      }));
      return ok(res, { tickets, total: result.total });
    }

    if (action === "create") {
      if (!userId) return fail(res, "Unauthorized", 401);
      const { subject, priority, category, siteId, targetUserId, body, context, notifyChannel } = payload;
      if (!subject || !String(subject).trim()) return fail(res, "Subject required", 400);

      let ownerId = userId;
      if (targetUserId && String(targetUserId).trim()) {
        if (!isAdmin) return fail(res, "Forbidden", 403);
        ownerId = String(targetUserId).trim();
      }

      const cat = category && VALID_CATEGORIES.has(String(category)) ? String(category) : "other";
      const pri = priority && VALID_PRIORITIES.has(String(priority)) ? String(priority) : "medium";
      const notify = notifyChannel && VALID_NOTIFY.has(String(notifyChannel)) ? String(notifyChannel) : "platform";

      let contextJson = null;
      if (context != null) {
        try {
          contextJson = typeof context === "string" ? context : JSON.stringify(context);
        } catch {
          contextJson = null;
        }
        if (contextJson && contextJson.length > 10000) contextJson = contextJson.slice(0, 10000);
      }

      const createPayload = {
        user_id: ownerId,
        subject: String(subject).trim(),
        status: "open",
        priority: pri,
        category: cat,
        site_id: siteId && String(siteId).trim() ? String(siteId).trim() : null,
        assigned_to_user_id: null,
        context_json: contextJson,
        notify_channel: notify,
        follower_ids: [],
      };

      let ticket;
      try {
        ticket = await databases.createDocument(DATABASE_ID, TICKETS_COLLECTION, sdk.ID.unique(), createPayload);
      } catch (e) {
        if (e.message && e.message.includes("Unknown attribute")) {
          ticket = await databases.createDocument(DATABASE_ID, TICKETS_COLLECTION, sdk.ID.unique(), {
            user_id: ownerId,
            subject: String(subject).trim(),
            status: "open",
            priority: pri,
            category: cat,
            site_id: siteId && String(siteId).trim() ? String(siteId).trim() : null,
          });
        } else throw e;
      }

      ticket = normalizeTicketRow(ticket);

      if (body && String(body).trim()) {
        await databases.createDocument(DATABASE_ID, MESSAGES_COLLECTION, sdk.ID.unique(), {
          ticket_id: ticket.$id,
          user_id: ownerId,
          body: String(body).trim(),
          is_staff: false,
        });
      }

      try {
        await logActivity(databases, {
          ticketId: ticket.$id,
          actorUserId: userId,
          action: "created",
          summary: "Ticket created",
        });
      } catch (e) {
        log("activity log skipped: " + e.message);
      }

      await pushTicketNotifications(databases, log, ticket, {
        title: "Support ticket opened",
        body: ticket.subject,
        meta: { ticketId: ticket.$id },
        actorUserId: userId,
      });

      return ok(res, { ticket, success: true });
    }

    if (action === "get") {
      if (!userId) return fail(res, "Unauthorized", 401);
      const { ticketId } = payload;
      if (!ticketId) return fail(res, "Missing ticketId", 400);

      let ticket = await databases.getDocument(DATABASE_ID, TICKETS_COLLECTION, ticketId);
      ticket = normalizeTicketRow(ticket);
      if (ticket.user_id !== userId && !isAdmin) return fail(res, "Forbidden", 403);

      const messages = await databases.listDocuments(DATABASE_ID, MESSAGES_COLLECTION, [
        sdk.Query.equal("ticket_id", ticketId),
        sdk.Query.orderAsc("$createdAt"),
      ]);

      let activities = { documents: [] };
      try {
        activities = await databases.listDocuments(DATABASE_ID, ACTIVITIES_COLLECTION, [
          sdk.Query.equal("ticket_id", ticketId),
          sdk.Query.orderAsc("$createdAt"),
          sdk.Query.limit(200),
        ]);
      } catch (e) {
        log("activities list skipped: " + e.message);
      }

      const reporter = await safeUserSummary(users, ticket.user_id);
      let assignee = null;
      if (ticket.assigned_to_user_id) assignee = await safeUserSummary(users, ticket.assigned_to_user_id);

      let contextParsed = null;
      if (ticket.context_json && String(ticket.context_json).trim()) {
        try {
          contextParsed = JSON.parse(ticket.context_json);
        } catch {
          contextParsed = null;
        }
      }

      const iFollow = ticket.user_id === userId || ticketFollowers(ticket).includes(userId);

      let recentFromReporter = [];
      if (isAdmin && ticket.user_id) {
        try {
          const recent = await databases.listDocuments(DATABASE_ID, TICKETS_COLLECTION, [
            sdk.Query.equal("user_id", ticket.user_id),
            sdk.Query.orderDesc("$updatedAt"),
            sdk.Query.limit(12),
          ]);
          recentFromReporter = recent.documents
            .filter((d) => d.$id !== ticketId)
            .slice(0, 5)
            .map((d) => ({
              $id: d.$id,
              subject: d.subject,
              status: d.status,
              priority: d.priority,
              $updatedAt: d.$updatedAt,
            }));
        } catch (e) {
          log("recentFromReporter: " + e.message);
        }
      }

      return ok(res, {
        ticket,
        messages: messages.documents,
        activities: activities.documents,
        reporter,
        assignee,
        context: contextParsed,
        iFollow,
        recentFromReporter,
      });
    }

    if (action === "listAgents") {
      if (!isAdmin) return fail(res, "Admin required", 403);
      const agents = await listAssignableAgents(teams, users, log);
      return ok(res, { agents });
    }

    if (action === "addMessage") {
      if (!userId) return fail(res, "Unauthorized", 401);
      const { ticketId, body, asStaff } = payload;
      if (!ticketId || !body || !String(body).trim()) return fail(res, "Missing ticketId or body", 400);

      let ticket = await databases.getDocument(DATABASE_ID, TICKETS_COLLECTION, ticketId);
      if (ticket.user_id !== userId && !isAdmin) return fail(res, "Forbidden", 403);

      /** Staff badge only for admins; `asStaff: false` = user-mode reply (same session, /support UI). */
      const markStaff = Boolean(isAdmin && asStaff !== false);

      await databases.createDocument(DATABASE_ID, MESSAGES_COLLECTION, sdk.ID.unique(), {
        ticket_id: ticketId,
        user_id: userId,
        body: String(body).trim(),
        is_staff: markStaff,
      });

      ticket = normalizeTicketRow(ticket);
      await databases.updateDocument(DATABASE_ID, TICKETS_COLLECTION, ticketId, { $updatedAt: new Date().toISOString() });
      ticket = normalizeTicketRow(await databases.getDocument(DATABASE_ID, TICKETS_COLLECTION, ticketId));

      try {
        await logActivity(databases, {
          ticketId,
          actorUserId: userId,
          action: "message",
          summary: markStaff ? "Staff reply" : "Customer reply",
        });
      } catch (e) {
        log("activity: " + e.message);
      }

      await pushTicketNotifications(databases, log, ticket, {
        title: "New reply on ticket",
        body: String(body).trim().slice(0, 200),
        meta: { ticketId },
        actorUserId: userId,
      });

      return ok(res, { success: true });
    }

    // `updateStatus` is the stable action name (older deployments). `updateTicket` is an alias.
    if (action === "updateStatus" || action === "updateTicket") {
      if (!isAdmin) return fail(res, "Admin required", 403);
      const { ticketId, status, priority, assignedToUserId } = payload;
      if (!ticketId) return fail(res, "Missing ticketId", 400);

      const before = normalizeTicketRow(await databases.getDocument(DATABASE_ID, TICKETS_COLLECTION, ticketId));
      const patch = {};

      if (status !== undefined && status !== null && String(status)) {
        if (!VALID_STATUSES.includes(String(status))) return fail(res, "Invalid status", 400);
        const next = String(status);
        if (next !== String(before.status || "")) patch.status = next;
      }
      if (priority !== undefined && priority !== null && String(priority)) {
        if (!VALID_PRIORITIES.has(String(priority))) return fail(res, "Invalid priority", 400);
        const next = String(priority);
        if (next !== String(before.priority || "")) patch.priority = next;
      }
      if (assignedToUserId !== undefined) {
        const raw = assignedToUserId === null || assignedToUserId === "" ? null : String(assignedToUserId).trim();
        if (raw) {
          const okAssign = await userIsAdmin(users, teams, raw);
          if (!okAssign) return fail(res, "Assignee must be an admin user", 400);
        }
        const prev = before.assigned_to_user_id ? String(before.assigned_to_user_id).trim() : null;
        if (raw !== prev) patch.assigned_to_user_id = raw;
      }

      if (Object.keys(patch).length === 0) return fail(res, "Nothing to update", 400);

      try {
        await databases.updateDocument(DATABASE_ID, TICKETS_COLLECTION, ticketId, patch);
      } catch (e) {
        if (e.message && e.message.includes("Unknown attribute")) {
          return fail(res, "Ticket schema missing new fields; sync Appwrite tables.", 500);
        }
        throw e;
      }

      const ticket = normalizeTicketRow(await databases.getDocument(DATABASE_ID, TICKETS_COLLECTION, ticketId));

      if (patch.status && patch.status !== before.status) {
        try {
          await logActivity(databases, {
            ticketId,
            actorUserId: userId,
            action: "status",
            summary: `Status set to ${patch.status}`,
            detail: { from: before.status, to: patch.status },
          });
        } catch (e) {
          log("activity: " + e.message);
        }
      }
      if (patch.priority && patch.priority !== before.priority) {
        try {
          await logActivity(databases, {
            ticketId,
            actorUserId: userId,
            action: "priority",
            summary: `Priority set to ${patch.priority}`,
            detail: { from: before.priority, to: patch.priority },
          });
        } catch (e) {
          log("activity: " + e.message);
        }
      }
      if ("assigned_to_user_id" in patch) {
        try {
          await logActivity(databases, {
            ticketId,
            actorUserId: userId,
            action: "assign",
            summary: patch.assigned_to_user_id ? `Assigned to user ${patch.assigned_to_user_id}` : "Unassigned",
            detail: { from: before.assigned_to_user_id || null, to: patch.assigned_to_user_id || null },
          });
        } catch (e) {
          log("activity: " + e.message);
        }
      }

      const notifyTitle = patch.status && patch.status !== before.status ? "Ticket status updated" : "Ticket updated";
      await pushTicketNotifications(databases, log, ticket, {
        title: notifyTitle,
        body: patch.status ? `${ticket.subject}: ${patch.status}` : ticket.subject,
        meta: { ticketId },
        actorUserId: userId,
      });

      return ok(res, { success: true });
    }

    if (action === "setFollow") {
      if (!userId) return fail(res, "Unauthorized", 401);
      const { ticketId, follow } = payload;
      if (!ticketId) return fail(res, "Missing ticketId", 400);
      const wantFollow = follow === true || follow === "true";

      let ticket = await databases.getDocument(DATABASE_ID, TICKETS_COLLECTION, ticketId);
      if (ticket.user_id !== userId && !isAdmin) return fail(res, "Forbidden", 403);

      const ownerId = ticket.user_id;
      let followers = ticketFollowers(ticket);
      if (userId === ownerId && wantFollow) {
        return ok(res, { success: true, iFollow: true, follower_ids: followers });
      }

      if (wantFollow) {
        if (!followers.includes(userId)) followers = [...followers, userId];
      } else {
        followers = followers.filter((id) => id !== userId);
      }

      try {
        await databases.updateDocument(DATABASE_ID, TICKETS_COLLECTION, ticketId, { follower_ids: followers });
      } catch (e) {
        if (e.message && e.message.includes("Unknown attribute")) {
          return fail(res, "Follow is not available until follower_ids exists on tickets.", 500);
        }
        throw e;
      }

      try {
        await logActivity(databases, {
          ticketId,
          actorUserId: userId,
          action: wantFollow ? "follow" : "unfollow",
          summary: wantFollow ? "Started following" : "Stopped following",
        });
      } catch {}

      return ok(res, { success: true, iFollow: wantFollow || userId === ownerId, follower_ids: followers });
    }

    return fail(res, "Unknown action: " + action, 400);
  } catch (e) {
    error(e.message);
    return fail(res, e.message || "Internal error", 500);
  }
};
