const sdk = require("node-appwrite");
const stripe = require("stripe");
const handleList = require("./handlers/list");

function createClient(sdkLib, { endpoint, projectId, apiKey }) {
  const client = new sdkLib.Client().setEndpoint(endpoint).setProject(projectId);
  if (apiKey) client.setKey(apiKey);
  return client;
}
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
    const endpoint = process.env.APPWRITE_ENDPOINT || process.env.APPWRITE_FUNCTION_ENDPOINT;
    const projectId = process.env.APPWRITE_PROJECT_ID || process.env.APPWRITE_FUNCTION_PROJECT_ID;
    const apiKey = process.env.APPWRITE_API_KEY || process.env.APPWRITE_FUNCTION_API_KEY || process.env.APPWRITE_KEY;

    if (!endpoint || !projectId || !apiKey) {
      error("Appwrite configuration missing");
      return res.json({ success: false, message: "Appwrite config missing" }, 500);
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

    const client = createClient(sdk, { endpoint, projectId, apiKey });
    const databases = new sdk.Databases(client);
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
