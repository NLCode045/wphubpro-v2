/**
 * ai-content: Consumer function for AI/LLM operations
 * Routes to openai-gateway - no credentials needed
 */
const { callGateway } = require('../_shared/consumer-gateway-caller');

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

    const result = await callGateway('openai-gateway', action, payload.payload || payload);

    if (!result.success) {
      error(`openai-gateway error: ${result.message}`);
      return res.json(result, 500);
    }

    return res.json(result);
  } catch (err) {
    error(`ai-content error: ${err.message}`);
    return res.json({ success: false, message: err.message }, 500);
  }
};
