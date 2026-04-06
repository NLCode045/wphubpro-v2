/**
 * stripe-customers: Consumer function for Stripe customer operations
 * Routes to stripe-gateway via gateway-utils
 *
 * Pure data flow - no credentials, no SDK initialization
 */

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
  const response = await fetch(
    `${process.env.APPWRITE_FUNCTION_ENDPOINT}/functions/gateway-utils/executions`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        operation: 'call-gateway',
        gateway_id: 'stripe-gateway',
        action,
        payload,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Gateway utils returned ${response.status}: ${response.statusText}`);
  }

  return await response.json();
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
      error(`stripe-gateway error: ${result.message}`);
      return res.json(result, 500);
    }

    return res.json(result);
  } catch (err) {
    error(`stripe-customers error: ${err.message}`);
    return res.json({ success: false, message: err.message }, 500);
  }
};
