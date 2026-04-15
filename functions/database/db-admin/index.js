/**
 * db-admin: Consumer function for admin database operations
 * Invokes appwrite-gateway via Functions.createExecution (bootstrap key only).
 */
const sdk = require('node-appwrite');
const { getAppwriteBootstrap } = require('../../subscriptions/stripe-consumer/lib/appwriteEnv');

const GATEWAY_ID = process.env.APPWRITE_FUNCTION_APPWRITE_GATEWAY || 'appwrite-gateway';

async function callGateway(action, payload = {}) {
  const { endpoint, projectId, apiKey } = getAppwriteBootstrap();
  if (!endpoint || !projectId || !apiKey) {
    throw new Error('APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID and APPWRITE_API_KEY are required');
  }

  const client = new sdk.Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
  const functions = new sdk.Functions(client);
  const body = JSON.stringify({
    action,
    payload: payload && typeof payload === 'object' ? payload : {},
  });

  const response = await functions.createExecution(GATEWAY_ID, body, false);

  if (!response.responseBody) {
    throw new Error('No response from appwrite-gateway');
  }

  const result =
    typeof response.responseBody === 'string' ? JSON.parse(response.responseBody) : response.responseBody;

  return result;
}

function parsePayload(req) {
  if (!req) return {};
  if (req.body && typeof req.body === 'object') return req.body;
  if (req.bodyRaw && typeof req.bodyRaw === 'string') {
    try {
      return JSON.parse(req.bodyRaw);
    } catch {
      return {};
    }
  }
  if (req.payload && typeof req.payload === 'string') {
    try {
      return JSON.parse(req.payload);
    } catch {
      return {};
    }
  }
  if (req.payload && typeof req.payload === 'object') return req.payload;
  return {};
}

module.exports = async ({ req, res, log, error }) => {
  try {
    const payload = parsePayload(req);
    const action = String(payload.action || req.query?.action || '').toLowerCase().trim();

    if (!action) {
      return res.json({ success: false, message: 'action required' }, 400);
    }

    const inner = payload.payload !== undefined ? payload.payload : payload;
    const result = await callGateway(action, typeof inner === 'object' && inner !== null ? inner : {});

    if (!result.success) {
      error(`appwrite-gateway error: ${result.message}`);
      return res.json(result, 500);
    }

    return res.json(result);
  } catch (err) {
    error(`db-admin error: ${err.message}`);
    return res.json({ success: false, message: err.message }, 500);
  }
};
