const sdk = require("node-appwrite");
const stripe = require("stripe");
const handleList = require("./handlers/list");
const { hasAppwriteBootstrap } = require("../../subscriptions/stripe-consumer/lib/appwriteEnv");
const { createServerClientAndDatabases } = require("../../database/fetchAppwriteCredentialsFromGateway");
const handleUpdate = require("./handlers/update");
const handleLoginAs = require("./handlers/login-as");

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
  return {};
}

module.exports = async ({ req, res, log, error }) => {
  try {
    if (!hasAppwriteBootstrap()) {
      error("Appwrite configuration missing");
      return res.json({ success: false, message: "Appwrite config missing" }, 500);
    }

    let client;
    let databases;
    let endpoint;
    let projectId;
    let apiKey;
    try {
      ({ client, databases, endpoint, projectId, apiKey } = await createServerClientAndDatabases(log, error));
    } catch (e) {
      error(e.message);
      return res.json({ success: false, message: "Appwrite credentials unavailable" }, 500);
    }

    const payload = parsePayload(req);
    req._parsedPayload = payload;

    const actionRaw = (req.query?.action || payload.action || "").toString().toLowerCase();
    const actionMap = {
      list: "list",
      "list-users": "list",
      update: "update",
      "update-user": "update",
      "login-as": "login-as",
      loginas: "login-as",
      impersonate: "login-as",
    };
    const action = actionMap[actionRaw] || actionRaw;

    // Debug logging
    log("=== DEBUG: admin-manage-users request ===");
    log("Request headers: " + JSON.stringify({
      "x-appwrite-user-id": req.headers?.["x-appwrite-user-id"] || "(not set)",
      "X-Appwrite-User-Id": req.headers?.["X-Appwrite-User-Id"] || "(not set)",
      "x-appwrite-function-user-id": req.headers?.["x-appwrite-function-user-id"] || "(not set)",
      "X-Appwrite-Function-User-Id": req.headers?.["X-Appwrite-Function-User-Id"] || "(not set)",
      "x-appwrite-impersonate-user-id": req.headers?.["x-appwrite-impersonate-user-id"] || "(not set)",
      "X-Appwrite-Impersonate-User-Id": req.headers?.["X-Appwrite-Impersonate-User-Id"] || "(not set)",
    }));
    log("Request payload: " + JSON.stringify(payload));
    log("Action: " + action);
    log("=== END DEBUG ===");

    const stripeInstance = process.env.STRIPE_SECRET_KEY ? stripe(process.env.STRIPE_SECRET_KEY) : null;

    const ctx = {
      client,
      databases,
      stripe: stripeInstance,
      APPWRITE_ENDPOINT: endpoint,
      APPWRITE_PROJECT_ID: projectId,
      APPWRITE_API_KEY: apiKey,
    };

    if (action === "list") {
      return await handleList({ req, res, log, error }, ctx);
    }
    if (action === "update") {
      return await handleUpdate({ req, res, log, error }, ctx);
    }
    if (action === "login-as") {
      return await handleLoginAs({ req, res, log, error }, ctx);
    }

    return res.json(
      { success: false, message: 'Invalid or missing action. Use action: "list", "update", or "login-as".' },
      400
    );
  } catch (err) {
    error(`admin-manage-users failed: ${err.message}`);
    return res.json({ success: false, message: err.message || "Internal error" }, 500);
  }
};
