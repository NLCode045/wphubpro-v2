/**
 * Diagnostic function: shows which Appwrite req fields are populated and parsePayload() output.
 * Safe for staging; restrict or disable in production.
 */
const { parsePayload } = require('../../_shared/http.js');

const PREVIEW_MAX = 200;

function probeField(req, key) {
  if (!req || !Object.prototype.hasOwnProperty.call(req, key)) {
    return { present: false };
  }
  const v = req[key];
  if (v === null) return { present: true, valueKind: 'null' };
  const t = typeof v;
  if (t === 'string') {
    const preview = v.length > PREVIEW_MAX ? `${v.slice(0, PREVIEW_MAX)}…` : v;
    return { present: true, valueKind: 'string', length: v.length, preview };
  }
  if (Array.isArray(v)) {
    return { present: true, valueKind: 'array', length: v.length };
  }
  if (t === 'object') {
    const keys = Object.keys(v);
    return {
      present: true,
      valueKind: 'object',
      keyCount: keys.length,
      keysSample: keys.slice(0, 24),
    };
  }
  return { present: true, valueKind: t };
}

module.exports = async ({ req, res, log, error }) => {
  try {
    const parsed = parsePayload(req);
    const headers = req.headers || {};
    const trigger =
      headers['x-appwrite-trigger'] ||
      headers['X-Appwrite-Trigger'] ||
      null;

    const body = {
      success: true,
      parsed,
      probe: {
        bodyJson: probeField(req, 'bodyJson'),
        bodyText: probeField(req, 'bodyText'),
        body: probeField(req, 'body'),
        bodyRaw: probeField(req, 'bodyRaw'),
        payload: probeField(req, 'payload'),
        query: probeField(req, 'query'),
      },
      trigger,
    };

    log(`test-request-shape probe keys: ${JSON.stringify(body.probe)}`);
    return res.json(body);
  } catch (e) {
    error(`test-request-shape: ${e.message}`);
    return res.json({ success: false, message: e.message }, 500);
  }
};
