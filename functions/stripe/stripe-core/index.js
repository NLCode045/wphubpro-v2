// Stripe Core - webhook-only handler
// Stripe is source of truth; no Appwrite writes for subscription/plan data
const sdk = require("node-appwrite");

/**
 * Call stripe-gateway to verify webhook
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
      true
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

/**
 * Accepts only Stripe webhook requests. Verifies signature, logs events, returns 200.
 * All subscription/plan data lives in Stripe; no sync to Appwrite.
 */
module.exports = async ({ req, res, log, error }) => {
  if (req.headers && req.headers["stripe-signature"]) {
    return handleWebhook({ req, res, log, error });
  }
  return res.json(
    { success: false, message: "stripe-core only accepts Stripe webhook requests." },
    400
  );
};

async function handleWebhook({ req, res, log, error }) {
  const endpoint = process.env.APPWRITE_ENDPOINT ||
    process.env.APPWRITE_FUNCTION_ENDPOINT ||
    process.env.APPWRITE_FUNCTION_API_ENDPOINT;
  const projectId = process.env.APPWRITE_PROJECT_ID || process.env.APPWRITE_FUNCTION_PROJECT_ID;
  const apiKey = process.env.APPWRITE_API_KEY ||
    process.env.APPWRITE_FUNCTION_API_KEY ||
    process.env.APPWRITE_KEY;

  if (!endpoint || !projectId || !apiKey) {
    error("Appwrite configuration missing");
    return res.json({ success: false, message: "Appwrite configuration missing" }, 500);
  }

  let verificationResult;
  try {
    const sig = req.headers["stripe-signature"];
    const rawBody = req.body instanceof Buffer ? req.body : Buffer.from(req.body || "", "utf8");

    verificationResult = await callStripeGateway(
      'verify-webhook',
      {
        signature: sig,
        body: rawBody.toString('utf8'),
      },
      log,
      error
    );
  } catch (err) {
    error("Webhook signature verification failed: " + err.message);
    return res.json({ success: false, message: "Webhook signature verification failed" }, 400);
  }

  const event = verificationResult.event;
  if (!event) {
    error("No event data from webhook verification");
    return res.json({ success: false, message: "Invalid webhook event" }, 400);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        log("Checkout session completed:", event.data.object.id);
        break;

      case "invoice.paid":
        log("Invoice paid:", event.data.object.id);
        break;

      case "customer.subscription.updated":
        log("Subscription updated:", event.data.object.id);
        break;

      case "customer.subscription.deleted":
        log("Subscription deleted:", event.data.object.id);
        break;

      default:
        log("Unhandled event type:", event.type);
    }
    return res.json({ success: true });
  } catch (err) {
    error("Webhook handler error: " + err.message);
    return res.json({ success: false, message: "Webhook handler error" }, 500);
  }
}
