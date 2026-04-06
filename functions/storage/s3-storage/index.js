/**
 * s3-storage: Consumer function for AWS S3 storage operations
 * Routes to s3-gateway via gateway-utils
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

async function callGatewayUtils(action, payload) {
  const client = new sdk.Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(process.env.APPWRITE_FUNCTION_API_KEY);

  const functions = new sdk.Functions(client);

  const execution = await functions.createExecution(
    'gateway-utils',
    JSON.stringify({
      operation: 'call-gateway',
      gateway_id: 's3-gateway',
      action,
      payload,
    }),
    false
  );

  if (execution.status !== 'completed') {
    throw new Error(`Gateway execution failed: ${execution.statusCode}`);
  }

  return JSON.parse(execution.responseBody);
}

module.exports = async ({ req, res, log, error }) => {
  try {
    const payload = parsePayload(req);
    const action = String(payload.action || req.query?.action || '').toLowerCase().trim();

    if (!action) {
      return res.json({ success: false, message: 'action required' }, 400);
    }

    const result = await callGatewayUtils(action, payload.payload || payload);

    if (!result.success) {
      error(`s3-gateway error: ${result.message}`);
      return res.json(result, 500);
    }

    return res.json(result);
  } catch (err) {
    error(`s3-storage error: ${err.message}`);
    return res.json({ success: false, message: err.message }, 500);
  }
};
