/**
 * site-pagespeed: Google PageSpeed Insights v5 for one strategy per call (`desktop` or `mobile`).
 * Delegates PSI analysis to google-pagespeed-gateway.
 * Auth: JWT; user must own the site document.
 */
const sdk = require('node-appwrite');
const { getAppwriteBootstrap, hasAppwriteBootstrap } = require('../../subscriptions/stripe-consumer/lib/appwriteEnv');
const { createServerClientAndDatabases } = require('../../database/fetchAppwriteCredentialsFromGateway');

function parsePayload(req) {
  if (!req) return {};
  let body = req.body;
  if (body && typeof body === 'object') {
    if (body.siteId || body.site_id) return body;
    if (typeof body.body === 'string') {
      try {
        const parsed = JSON.parse(body.body.trim());
        return parsed && typeof parsed === 'object' ? parsed : {};
      } catch {
        return {};
      }
    }
    return body;
  }
  const raw = req.payload || req.bodyRaw || req.body;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw.trim());
    } catch {
      return {};
    }
  }
  return {};
}

function ok(res, payload = {}, statusCode = 200) {
  return res.json(payload, statusCode);
}

function fail(res, message, statusCode = 500, extra = {}) {
  return res.json({ success: false, message, ...extra }, statusCode);
}

/**
 * Merge one strategy into `performance_meta` JSON (keeps the other strategy if present).
 * @param {string} existingRaw
 * @param {'desktop'|'mobile'} strategy
 * @param {{ scores: object, coreWebVitals: object, analyzedUrl?: string, lighthouseVersion?: string }} slice
 */
function mergePerformanceMeta(existingRaw, strategy, slice) {
  let root = {};
  if (existingRaw && typeof existingRaw === 'string' && existingRaw.trim()) {
    try {
      const p = JSON.parse(existingRaw);
      if (p && typeof p === 'object' && !Array.isArray(p)) root = p;
    } catch (_) {
      root = {};
    }
  }
  const now = new Date().toISOString();
  root[strategy] = {
    success: true,
    scores: slice.scores,
    coreWebVitals: slice.coreWebVitals,
    analyzedUrl: slice.analyzedUrl,
    lighthouseVersion: slice.lighthouseVersion,
    fetchedAt: now,
  };
  root.updatedAt = now;
  return JSON.stringify(root);
}

function normalizeUrl(raw) {
  if (!raw || typeof raw !== 'string') return '';
  const t = raw.trim();
  if (!t) return '';
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t}`;
}

/**
 * Call google-pagespeed-gateway with given action and payload
 */
async function callGooglePageSpeedGateway(action, payload, log, error) {
  const { endpoint, projectId, apiKey } = getAppwriteBootstrap();
  if (!endpoint || !projectId || !apiKey) {
    throw new Error('Appwrite bootstrap is not configured');
  }

  const gatewayClient = new sdk.Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);

  const functions = new sdk.Functions(gatewayClient);
  const gatewayFunctionId = process.env.GOOGLE_PAGESPEED_GATEWAY_FUNCTION_ID || 'google-pagespeed-gateway';

  try {
    const response = await functions.createExecution(
      gatewayFunctionId,
      JSON.stringify({ action, payload }),
      true
    );

    if (!response.responseBody) {
      throw new Error('No response from google-pagespeed-gateway');
    }

    const result = typeof response.responseBody === 'string'
      ? JSON.parse(response.responseBody)
      : response.responseBody;

    if (!result.success) {
      throw new Error(result.message || 'Gateway operation failed');
    }

    return result;
  } catch (err) {
    error(`google-pagespeed-gateway call failed: ${err.message}`);
    throw err;
  }
}

module.exports = async ({ req, res, log, error }) => {
  if (!hasAppwriteBootstrap()) {
    error('[site-pagespeed] Missing Appwrite server env');
    return fail(res, 'Function environment is not configured.', 500);
  }

  let body;
  try {
    body = parsePayload(req);
  } catch {
    return fail(res, 'Invalid JSON body.', 400);
  }

  const siteId = body.siteId || body.site_id;
  if (!siteId) {
    return fail(res, 'siteId is required.', 400);
  }

  const authHeader =
    req.headers?.authorization ||
    req.headers?.Authorization ||
    req.headers?.['x-appwrite-user-jwt'] ||
    req.headers?.['x-appwrite-jwt'] ||
    '';
  const headerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : authHeader.trim();
  const bodyToken = typeof body.jwt === 'string' ? body.jwt.trim() : '';
  const isValidFormat = (t) => {
    const parts = t ? t.split('.') : [];
    return parts.length === 3 && parts.every((p) => p && p.length >= 10);
  };
  const token = isValidFormat(bodyToken) ? bodyToken : isValidFormat(headerToken) ? headerToken : headerToken || bodyToken;
  if (!token || !isValidFormat(token)) {
    return fail(res, 'Missing or invalid JWT.', 401);
  }

  try {
    const { databases, endpoint, projectId } = await createServerClientAndDatabases(log, error);

    const jwtClient = new sdk.Client().setEndpoint(endpoint).setProject(projectId).setJWT(token);
    const account = new sdk.Account(jwtClient);
    let jwtUser;
    try {
      jwtUser = await account.get();
    } catch (e) {
      log(`[site-pagespeed] JWT failed: ${e.message}`);
      return fail(res, 'Invalid or expired JWT.', 401);
    }
    const userId = jwtUser?.$id;
    if (!userId) {
      return fail(res, 'Could not determine user from JWT.', 401);
    }

    const siteDoc = await databases.getDocument('platform_db', 'sites', siteId);
    const siteUserId = siteDoc.user_id || siteDoc.userId;
    if (siteUserId !== userId) {
      return fail(res, 'Site does not belong to this user.', 403);
    }

    const url = normalizeUrl(siteDoc.site_url || siteDoc.siteUrl || '');
    if (!url) {
      return fail(res, 'Site has no URL to analyze.', 400);
    }

    const strategyRaw = typeof body.strategy === 'string' ? body.strategy.trim().toLowerCase() : '';
    const strategy = strategyRaw === 'mobile' ? 'mobile' : 'desktop';

    // Call google-pagespeed-gateway for PSI analysis
    const result = await callGooglePageSpeedGateway('analyze', { url, strategy }, log, error);

    try {
      const existing = siteDoc.performance_meta || siteDoc.performanceMeta || '';
      const merged = mergePerformanceMeta(existing, strategy, {
        scores: result.scores,
        coreWebVitals: result.coreWebVitals,
        analyzedUrl: result.analyzedUrl,
        lighthouseVersion: result.lighthouseVersion,
      });
      await databases.updateDocument('platform_db', 'sites', siteId, { performance_meta: merged });
    } catch (persistErr) {
      log(`[site-pagespeed] performance_meta persist failed: ${persistErr.message}`);
    }

    return ok(res, {
      success: true,
      strategy: result.strategy,
      scores: result.scores,
      coreWebVitals: result.coreWebVitals,
      analyzedUrl: result.analyzedUrl,
      lighthouseVersion: result.lighthouseVersion,
    });
  } catch (e) {
    error(`[site-pagespeed] ${e.message}`);
    return fail(res, e.message || 'PageSpeed request failed.', 500);
  }
};
