const sdk = require("node-appwrite");
const { ensureStripeCustomerForUser } = require("./ensureStripeCustomer");
const { callStripeGateway } = require("./lib/callStripeGateway");
const { mergedEnv } = require("./lib/mergedEnv");
const { getAppwriteBootstrapFromEnv, hasAppwriteBootstrap } = require("./lib/appwriteEnv");

function parsePayload(req) {
  if (!req) return {};
  if (req.body && typeof req.body === "object") return req.body;
  if (req.payload && typeof req.payload === "string") {
    try {
      return JSON.parse(req.payload);
    } catch {
      return {};
    }
  }
  if (req.payload && typeof req.payload === "object") return req.payload;
  return {};
}

module.exports = async ({ req, res, error, log }) => {
  const env = mergedEnv(req);
  const databaseId = env.APPWRITE_DATABASE_ID || env.DATABASE_ID;

  if (!hasAppwriteBootstrap(env) || !databaseId || !env.ACCOUNTS_COLLECTION_ID) {
    error("Missing environment variables. Please check your function settings.");
    return res.json({ error: "Internal Server Error: Missing configuration." }, 500);
  }

  const { endpoint, projectId, apiKey } = getAppwriteBootstrapFromEnv(env);
  const client = new sdk.Client();
  client.setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
  const databases = new sdk.Databases(client);

  const gateway = { callStripeGateway, log, error };

  const payload = parsePayload(req);
  const action = (payload.action || req.query?.action || "").toString().toLowerCase();

  if (action === "ensure") {
    const userId =
      process.env.APPWRITE_FUNCTION_USER_ID ||
      req.headers?.["x-appwrite-user-id"] ||
      req.headers?.["X-Appwrite-User-Id"];
    if (!userId) {
      return res.json({ error: "User not authenticated." }, 401);
    }
    try {
      const users = new sdk.Users(client);
      const appwriteUser = await users.get(userId);
      const email = appwriteUser.email;
      if (!email) {
        return res.json({ success: false, message: "User email required for billing." }, 400);
      }
      const user = {
        $id: appwriteUser.$id,
        email,
        name: appwriteUser.name || undefined,
      };
      const result = await ensureStripeCustomerForUser(user, databases, env, { skipDefaultSubscription: true }, gateway);
      return res.json(result);
    } catch (err) {
      error("ensure failed: " + err.message);
      return res.json({ error: err.message || "Could not set up billing" }, 500);
    }
  }

  const eventData =
    req?.env?.APPWRITE_FUNCTION_EVENT_DATA || req?.variables?.APPWRITE_FUNCTION_EVENT_DATA;
  if (!eventData) {
    return res.json(
      {
        error:
          'Missing APPWRITE_FUNCTION_EVENT_DATA. For browser clients use { "action": "ensure" }.',
      },
      400
    );
  }

  try {
    const user = JSON.parse(eventData);
    if (!user?.$id || !user.email) {
      return res.json({ success: false, message: "User id/email required." }, 400);
    }
    const result = await ensureStripeCustomerForUser(user, databases, env, { skipDefaultSubscription: false }, gateway);
    return res.json(result);
  } catch (err) {
    error("Failed to create stripe customer:", err);
    return res.json({ error: err.message }, 500);
  }
};
