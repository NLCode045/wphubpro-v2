/* eslint-disable no-unused-vars */
const sdk = require("node-appwrite");
const { hasAppwriteBootstrap } = require("../../subscriptions/stripe-consumer/lib/appwriteEnv");
const { createServerClientAndDatabases } = require("../../database/fetchAppwriteCredentialsFromGateway");

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

function ok(res, payload = {}, statusCode = 200) {
  return res.json(payload, statusCode);
}

function fail(res, message, statusCode = 500, extra = {}) {
  return res.json({ success: false, message, ...extra }, statusCode);
}

function parseStoredValue(str) {
  if (str == null || str === "") return {};
  try {
    return JSON.parse(str);
  } catch {
    return { _invalidJson: true, _raw: String(str) };
  }
}

async function userIsAdmin(users, teams, userId, log) {
  try {
    const adminTeamId = "admin";
    const memberships = await teams.listMemberships(adminTeamId);
    if (memberships.memberships.some((m) => m.userId === userId)) return true;
  } catch (teamErr) {
    log("Could not check team membership: " + teamErr.message);
  }
  const user = await users.get(userId);
  return user.labels?.some(
    (l) => l.toLowerCase() === "admin" || l.toLowerCase() === "administrator"
  );
}

module.exports = async ({ req, res, log, error }) => {
  if (!hasAppwriteBootstrap()) {
    error("Function environment variables are not configured correctly.");
    return fail(res, "Function environment is not configured.", 500);
  }

  let databases;
  let users;
  let teams;
  try {
    ({ databases, users, teams } = await createServerClientAndDatabases(log, error));
  } catch (e) {
    error(e.message);
    return fail(res, "Could not resolve Appwrite credentials.", 500);
  }

  // Parse payload from request body
  let payload = {};

  try {
    payload = parsePayload(req);
  } catch (e) {
    error("Failed to parse request body: " + e.message);
    return fail(res, "Invalid request body", 400);
  }

  const actionRaw = (payload.action || "").toString().toLowerCase();
  const { category, settings, userId } = payload;

  if (!userId) {
    error("Missing userId in request body");
    return fail(res, "Missing userId in request body", 400);
  }

  try {
    const isAdmin = await userIsAdmin(users, teams, userId, log);
    log("User admin check for " + userId + ": " + isAdmin);

    if (!isAdmin) {
      log("User " + userId + " is not an admin");
      return fail(res, "Forbidden: Admin access required", 403);
    }

    const DATABASE_ID = "platform_db";
    const COLLECTION_ID = "platform_settings";

    if (actionRaw === "list") {
      log("Listing platform_settings for admin " + userId);
      const list = await databases.listDocuments(DATABASE_ID, COLLECTION_ID, [sdk.Query.limit(500)]);
      const items = (list.documents || []).map((doc) => ({
        key: doc.key,
        value: parseStoredValue(doc.value),
      }));
      return ok(res, { success: true, items });
    }

    if (!category || settings === undefined) {
      error(
        `Missing parameters. Received: category=${category}, userId=${userId}, settings=${JSON.stringify(
          settings
        )}`
      );
      return fail(res, "Missing category or settings in request body (use action: list to read)", 400);
    }

    log("Updating settings for category: " + category);
    const valueStr = JSON.stringify(settings);

    const existing = await databases.listDocuments(DATABASE_ID, COLLECTION_ID, [
      sdk.Query.equal("key", category),
    ]);

    if (existing.total > 0) {
      log("Updating existing document: " + existing.documents[0].$id);
      await databases.updateDocument(DATABASE_ID, COLLECTION_ID, existing.documents[0].$id, {
        value: valueStr,
      });
      return ok(res, { success: true, message: "Settings updated" });
    }

    log("Creating new document for category: " + category);
    const newDoc = await databases.createDocument(DATABASE_ID, COLLECTION_ID, sdk.ID.unique(), {
      key: category,
      value: valueStr,
    });
    log("Settings created successfully with ID: " + newDoc.$id);
    return ok(res, { success: true, message: "Settings created" });
  } catch (e) {
    error(e.message);
    return fail(res, e.message, 500);
  }
};
