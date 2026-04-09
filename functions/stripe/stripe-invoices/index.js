/**
 * stripe-invoices: Consumer function for Stripe invoice operations
 * Routes to stripe-gateway via Appwrite Functions SDK
 *
 * Pure data flow - no credentials, no vault access
 */
const sdk = require('node-appwrite');

function parsePayload(req) {
  if (!req) return {};
  if (req.body && typeof req.body === 'object') return req.body;
  if (req.bodyRaw && typeof req.bodyRaw === 'string') {
    try { return JSON.parse(req.bodyRaw); } catch { return {}; }
  }
  if (req.payload && typeof req.payload === 'string') {
    try { return JSON.parse(req.payload); } catch { return {}; }
  }
  if (req.payload && typeof req.payload === 'object') return req.payload;
  return {};
}

/**
 * Call stripe-gateway using Appwrite SDK
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

module.exports = async ({ req, res, log, error }) => {
  try {
    const payload = parsePayload(req);
    const action = String(payload.action || req.query?.action || '').toLowerCase().trim();

    if (!action) {
      return res.json({ success: false, message: 'action required' }, 400);
    }

    const result = await callStripeGateway(action, payload.payload || payload, log, error);
    return res.json(result);
  } catch (err) {
    error(`stripe-invoices error: ${err.message}`);
    return res.json({ success: false, message: err.message }, 500);
  }
};
