const sdk = require("node-appwrite");
const stripe = require("stripe");
const { getConnectorCredentials } = require("../_shared/vault-client.js");
const handleList = require("./handlers/list");
const handleGetDetail = require("./handlers/get-detail");
const handleSendPasswordRecovery = require("./handlers/send-password-recovery");
const handleDeleteUser = require("./handlers/delete-user");
const handleUpdateAccount = require("./handlers/update-account");
const handleEnsureStripeCustomer = require("./handlers/ensure-stripe-customer");

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
    const endpoint =
      process.env.APPWRITE_ENDPOINT || process.env.APPWRITE_FUNCTION_ENDPOINT || process.env.APPWRITE_FUNCTION_API_ENDPOINT;
    const projectId = process.env.APPWRITE_PROJECT_ID || process.env.APPWRITE_FUNCTION_PROJECT_ID;
    const apiKey = process.env.APPWRITE_API_KEY || process.env.APPWRITE_FUNCTION_API_KEY || process.env.APPWRITE_KEY;
    const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
    const VAULT_DB_ID = process.env.VAULT_DB_ID || "69d2ecf3000f449c752f";

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
      "get-detail": "get-detail",
      getdetail: "get-detail",
      "send-password-recovery": "send-password-recovery",
      "password-recovery": "send-password-recovery",
      "delete-user": "delete-user",
      deleteuser: "delete-user",
      "update-account": "update-account",
      updateaccount: "update-account",
      "ensure-stripe-customer": "ensure-stripe-customer",
      ensurestripecustomer: "ensure-stripe-customer",
    };
    const action = actionMap[actionRaw] || actionRaw;

    const client = createClient(sdk, { endpoint, projectId, apiKey });
    const databases = new sdk.Databases(client);

    // Try to get Stripe credentials from vault (optional for most operations, required for ensure-stripe-customer)
    let stripeInstance = null;
    if (action === "ensure-stripe-customer" || action === "update-account") {
      try {
        if (ENCRYPTION_KEY) {
          const stripeCredentials = await getConnectorCredentials("stripe", ENCRYPTION_KEY, databases, VAULT_DB_ID);
          if (stripeCredentials && stripeCredentials.STRIPE_SECRET_KEY) {
            stripeInstance = stripe(stripeCredentials.STRIPE_SECRET_KEY);
          }
        }
      } catch (err) {
        log("Warning: Could not retrieve Stripe credentials from vault: " + err.message);
      }
    }

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
    if (action === "get-detail") {
      return await handleGetDetail({ req, res, log, error }, ctx);
    }
    if (action === "send-password-recovery") {
      return await handleSendPasswordRecovery({ req, res, log, error }, ctx);
    }
    if (action === "delete-user") {
      return await handleDeleteUser({ req, res, log, error }, ctx);
    }
    if (action === "update-account") {
      return await handleUpdateAccount({ req, res, log, error }, ctx);
    }
    if (action === "ensure-stripe-customer") {
      return await handleEnsureStripeCustomer({ req, res, log, error }, ctx);
    }

    return res.json(
      {
        success: false,
        message:
          'Invalid or missing action. Use: "list", "update", "login-as", "get-detail", "send-password-recovery", "delete-user", "update-account", "ensure-stripe-customer".',
      },
      400,
    );
  } catch (err) {
    error(`admin-manage-users failed: ${err.message}`);
    return res.json({ success: false, message: err.message || "Internal error" }, 500);
  }
};
