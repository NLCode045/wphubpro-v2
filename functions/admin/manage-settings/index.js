/* eslint-disable no-unused-vars */
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

function parseStoredValue(str) {
  if (str == null || str === "") return {};
  try {
    return JSON.parse(str);
  } catch {
    return { _invalidJson: true, _raw: String(str) };
  }
}

function callerUserIdFromReq(req) {
  const fromEnv = process.env.APPWRITE_FUNCTION_USER_ID;
  if (fromEnv && String(fromEnv).trim()) return String(fromEnv).trim();
  const h = req.headers || {};
  const v =
    h["x-appwrite-user-id"] ||
    h["X-Appwrite-User-Id"] ||
    h["x-appwrite-function-user-id"] ||
    h["X-Appwrite-Function-User-Id"];
  return v ? String(v).trim() : "";
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
  const endpoint =
    process.env.APPWRITE_ENDPOINT ||
    process.env.APPWRITE_FUNCTION_ENDPOINT ||
    process.env.APPWRITE_FUNCTION_API_ENDPOINT;
  const projectId = process.env.APPWRITE_PROJECT_ID || process.env.APPWRITE_FUNCTION_PROJECT_ID;
  const apiKey = process.env.APPWRITE_API_KEY || process.env.APPWRITE_FUNCTION_API_KEY || process.env.APPWRITE_KEY;

  if (!endpoint || !projectId || !apiKey) {
    error("Function environment variables are not configured correctly.");
    return fail(res, "Function environment is not configured.", 500);
  }

  const client = createClient(sdk, { endpoint, projectId, apiKey });
  const databases = new sdk.Databases(client);
  const users = new sdk.Users(client);
  const teams = new sdk.Teams(client);

  let payload = {};

  try {
    payload = parsePayload(req);
  } catch (e) {
    error("Failed to parse request body: " + e.message);
    return fail(res, "Invalid request body", 400);
  }

  const actionRaw = String(payload.action || "")
    .toLowerCase()
    .trim();
  const { category, settings, userId: bodyUserId } = payload;

  const actorUserId = callerUserIdFromReq(req);
  if (!actorUserId) {
    return fail(res, "Unauthorized: could not resolve caller user", 401);
  }

  if (!bodyUserId) {
    error("Missing userId in request body");
    return fail(res, "Missing userId in request body", 400);
  }

  if (String(bodyUserId) !== actorUserId) {
    return fail(res, "userId must match the authenticated session user", 400);
  }

  try {
    const isAdmin = await userIsAdmin(users, teams, actorUserId, log);
    log("User admin check for " + actorUserId + ": " + isAdmin);

    if (!isAdmin) {
      log("User " + actorUserId + " is not an admin");
      return fail(res, "Forbidden: Admin access required", 403);
    }

    const DATABASE_ID = "platform_db";
    const COLLECTION_ID = "platform_settings";

    if (actionRaw === "list") {
      log("Listing platform_settings for admin " + actorUserId);
      const list = await databases.listDocuments(DATABASE_ID, COLLECTION_ID, [sdk.Query.limit(500)]);
      const items = (list.documents || []).map((doc) => ({
        key: doc.key,
        value: parseStoredValue(doc.value),
      }));
      return ok(res, { success: true, items });
    }

    if (!category || settings === undefined) {
      error(
        `Missing parameters. Received: category=${category}, userId=${actorUserId}, settings=${JSON.stringify(
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

    log("Found " + existing.total + " existing documents");

    if (existing.total > 0) {
      log("Updating existing document: " + existing.documents[0].$id);
      await databases.updateDocument(DATABASE_ID, COLLECTION_ID, existing.documents[0].$id, {
        value: valueStr,
      });
      log("Settings updated successfully for category: " + category);
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
