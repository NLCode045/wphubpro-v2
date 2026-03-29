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

module.exports = async ({ req, res, log, error }) => {
  const endpoint = process.env.APPWRITE_ENDPOINT || process.env.APPWRITE_FUNCTION_ENDPOINT;
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

  // Parse payload from request body
  let payload = {};

  try {
    payload = parsePayload(req);
  } catch (e) {
    error("Failed to parse request body: " + e.message);
    return fail(res, "Invalid request body", 400);
  }

  const { category, settings, userId } = payload;

  if (!category || !settings || !userId) {
    error(
      `Missing parameters. Received: category=${category}, userId=${userId}, settings=${JSON.stringify(
        settings
      )}`
    );
    return fail(res, "Missing category, settings, or userId in request body", 400);
  }

  log("Updating settings for category: " + category);
  log("User ID: " + userId);

  try {
    // Check if user is member of admin team
    let isAdmin = false;
    try {
      const adminTeamId = "admin";
      const memberships = await teams.listMemberships(adminTeamId);
      isAdmin = memberships.memberships.some((m) => m.userId === userId);
      log(
        "User admin check - Team memberships found: " + memberships.total + ", isAdmin: " + isAdmin
      );
    } catch (teamErr) {
      log("Could not check team membership: " + teamErr.message);
      // Fallback to label check for backwards compatibility
      const user = await users.get(userId);
      isAdmin = user.labels?.some(
        (l) => l.toLowerCase() === "admin" || l.toLowerCase() === "administrator"
      );
      log(
        "User admin check (fallback) - Labels: " +
          JSON.stringify(user.labels) +
          ", isAdmin: " +
          isAdmin
      );
    }

    if (!isAdmin) {
      log("User " + userId + " is not an admin");
      return fail(res, "Forbidden: Admin access required", 403);
    }

    log("User is admin, proceeding with settings update");

    const DATABASE_ID = "platform_db";
    const COLLECTION_ID = "platform_settings";
    const valueStr = JSON.stringify(settings);

    log("Querying for existing settings with key: " + category);

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
    } else {
      log("Creating new document for category: " + category);
      const newDoc = await databases.createDocument(DATABASE_ID, COLLECTION_ID, sdk.ID.unique(), {
        key: category,
        value: valueStr,
      });
      log("Settings created successfully with ID: " + newDoc.$id);
      return ok(res, { success: true, message: "Settings created" });
    }
  } catch (e) {
    error(e.message);
    return fail(res, e.message, 500);
  }
};
