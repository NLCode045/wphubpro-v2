/**
 * db-admin: Consumer function for admin database operations
 * Routes to appwrite-gateway - no credentials needed
 */

/**
 * Call a gateway function and return the result
 * This uses Appwrite's native function execution without needing credentials
 */
async function callGateway(gatewayFunctionId, action, payload = {}) {
  // Use fetch to call the gateway via Appwrite's built-in HTTP endpoint
  // This is available within the Appwrite function environment
  const functionUrl = `${process.env.APPWRITE_FUNCTION_ENDPOINT}/functions/${gatewayFunctionId}/executions`;

  try {
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action,
        payload,
      }),
    });

    if (!response.ok) {
      throw new Error(`Gateway returned ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    return result;
  } catch (err) {
    throw new Error(`Failed to call gateway: ${err.message}`);
  }
}

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

module.exports = async ({ req, res, log, error }) => {
  try {
    const payload = parsePayload(req);
    const action = String(payload.action || req.query?.action || '').toLowerCase().trim();

    if (!action) {
      return res.json({ success: false, message: 'action required' }, 400);
    }

    const result = await callGateway('appwrite-gateway', action, payload.payload || payload);

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
