/**
 * Stripe Payment Methods Function - Consumer
 * Routes to stripe-gateway for all Stripe operations
 * Actions: list, create-setup-intent, attach, detach, set-default, update-customer
 */
const sdk = require("node-appwrite");

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
  return req.query || {};
}

/**
 * Call stripe-gateway with given action and payload
 */
async function callStripeGateway(action, payload, log, error) {
  const endpoint = process.env.APPWRITE_ENDPOINT ||
    process.env.APPWRITE_FUNCTION_ENDPOINT ||
    process.env.APPWRITE_FUNCTION_API_ENDPOINT;
  const projectId = process.env.APPWRITE_PROJECT_ID || process.env.APPWRITE_FUNCTION_PROJECT_ID;
  const apiKey = process.env.APPWRITE_API_KEY ||
    process.env.APPWRITE_FUNCTION_API_KEY ||
    process.env.APPWRITE_KEY;

  const gatewayClient = new sdk.Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);

  const functions = new sdk.Functions(gatewayClient);
  const gatewayFunctionId = process.env.STRIPE_GATEWAY_FUNCTION_ID || 'stripe-gateway';

  try {
    const response = await functions.createExecution(
      gatewayFunctionId,
      JSON.stringify({ action, payload }),
      false
    );

    if (!response.responseBody) {
      throw new Error('No response from stripe-gateway');
    }

    const result = typeof response.responseBody === 'string'
      ? JSON.parse(response.responseBody)
      : response.responseBody;

    if (!result.success) {
      throw new Error(result.message || 'Gateway operation failed');
    }

    return result;
  } catch (err) {
    error(`stripe-gateway call failed: ${err.message}`);
    throw err;
  }
}

async function getStripeCustomerId(databases, userId, log, error) {
  const DATABASE_ID =
    process.env.DATABASE_ID || process.env.APPWRITE_DATABASE_ID || "platform_db";
  const ACCOUNTS_COLLECTION_ID =
    process.env.ACCOUNTS_COLLECTION_ID || process.env.APPWRITE_ACCOUNTS_COLLECTION_ID || "accounts";

  const accountDocs = await databases.listDocuments(DATABASE_ID, ACCOUNTS_COLLECTION_ID, [
    sdk.Query.equal("user_id", userId),
    sdk.Query.limit(1),
  ]);

  if (accountDocs.total === 0 || !accountDocs.documents[0].stripe_customer_id) {
    return null;
  }
  return accountDocs.documents[0].stripe_customer_id;
}

module.exports = async ({ req, res, log, error }) => {
  const APPWRITE_ENDPOINT =
    process.env.APPWRITE_ENDPOINT ||
    process.env.APPWRITE_FUNCTION_ENDPOINT ||
    process.env.APPWRITE_FUNCTION_API_ENDPOINT;
  const APPWRITE_PROJECT_ID =
    process.env.APPWRITE_PROJECT_ID || process.env.APPWRITE_FUNCTION_PROJECT_ID;
  const APPWRITE_API_KEY =
    process.env.APPWRITE_API_KEY || process.env.APPWRITE_FUNCTION_API_KEY || process.env.APPWRITE_KEY;

  const userId =
    process.env.APPWRITE_FUNCTION_USER_ID ||
    req.headers?.["x-appwrite-user-id"] ||
    req.headers?.["X-Appwrite-User-Id"];

  if (!userId) {
    return res.json({ success: false, error: "User not authenticated" }, 401);
  }
  if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT_ID || !APPWRITE_API_KEY) {
    return res.json({ success: false, error: "Appwrite configuration missing" }, 500);
  }

  const client = new sdk.Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID)
    .setKey(APPWRITE_API_KEY);
  const databases = new sdk.Databases(client);

  const payload = parsePayload(req);
  const action = (payload.action || req.query?.action || "list").toString().toLowerCase();

  try {
    const stripeCustomerId = await getStripeCustomerId(databases, userId, log, error);
    if (!stripeCustomerId) {
      return res.json({ success: false, error: "No Stripe customer found. Create a subscription first." }, 404);
    }

    if (action === "get-customer") {
      const result = await callStripeGateway('get-customer', { customerId: stripeCustomerId }, log, error);
      return res.json(result);
    }

    if (action === "list") {
      const result = await callStripeGateway('list-payment-methods', { customerId: stripeCustomerId }, log, error);
      return res.json(result);
    }

    if (action === "create-setup-intent") {
      const result = await callStripeGateway('create-setup-intent', { customerId: stripeCustomerId }, log, error);
      return res.json(result);
    }

    if (action === "attach") {
      const { paymentMethodId, setAsDefault } = payload;
      if (!paymentMethodId) {
        return res.json({ success: false, error: "paymentMethodId required" }, 400);
      }
      const result = await callStripeGateway('attach-payment-method', { 
        customerId: stripeCustomerId, 
        paymentMethodId, 
        setAsDefault 
      }, log, error);
      return res.json(result);
    }

    if (action === "detach") {
      const { paymentMethodId } = payload;
      if (!paymentMethodId) {
        return res.json({ success: false, error: "paymentMethodId required" }, 400);
      }
      const result = await callStripeGateway('detach-payment-method', { paymentMethodId }, log, error);
      return res.json(result);
    }

    if (action === "set-default") {
      const { paymentMethodId } = payload;
      if (!paymentMethodId) {
        return res.json({ success: false, error: "paymentMethodId required" }, 400);
      }
      const result = await callStripeGateway('set-default-payment-method', { 
        customerId: stripeCustomerId, 
        paymentMethodId 
      }, log, error);
      return res.json(result);
    }

    if (action === "update-customer") {
      const { name, email, phone, address } = payload;
      const result = await callStripeGateway('update-customer', { 
        customerId: stripeCustomerId,
        name,
        email,
        phone,
        address
      }, log, error);
      return res.json(result);
    }

    return res.json(
      {
        success: false,
        error:
          "Invalid action. Use: get-customer, list, create-setup-intent, attach, detach, set-default, update-customer",
      },
      400
    );
  } catch (err) {
    error("stripe-payment-methods failed: " + err.message);
    return res.json({ success: false, error: err.message || "Request failed" }, err.statusCode || 500);
  }
};
