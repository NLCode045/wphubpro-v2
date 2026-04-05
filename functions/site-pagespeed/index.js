/**
 * site-pagespeed: Google PageSpeed Insights v5 for one strategy per call (`desktop` or `mobile`).
 * API key: GOOGLE_PAGESPEED_API_KEY (or aliases) in Appwrite function global env.
 * Auth: JWT; user must own the site document.
 */
const sdk = require('node-appwrite');

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

function scoreFromCategory(categories, id) {
  const c = categories && categories[id];
  if (!c || typeof c.score !== 'number' || Number.isNaN(c.score)) return null;
  return Math.round(Math.min(1, Math.max(0, c.score)) * 100);
}

function auditNumeric(audits, id) {
  const a = audits && audits[id];
  if (!a || typeof a.numericValue !== 'number' || Number.isNaN(a.numericValue)) return null;
  return a.numericValue;
}

/** TTFB (via server-response-time), LCP, CLS from Lighthouse audits. */
function extractCoreWebVitals(lr) {
  const audits = lr.audits || {};
  return {
    timeToFirstByteMs: auditNumeric(audits, 'server-response-time'),
    largestContentfulPaintMs: auditNumeric(audits, 'largest-contentful-paint'),
    cumulativeLayoutShift: auditNumeric(audits, 'cumulative-layout-shift'),
  };
}

/**
 * @param {string} url
 * @param {string} psiKey
 * @param {'desktop'|'mobile'} strategy
 * @param {(s:string)=>void} log
 */
async function runPsi(url, psiKey, strategy, log) {
  try {
    const params = new URLSearchParams();
    params.set('url', url);
    params.set('key', String(psiKey).trim());
    params.set('strategy', strategy);
    for (const c of ['PERFORMANCE', 'ACCESSIBILITY', 'BEST_PRACTICES', 'SEO']) {
      params.append('category', c);
    }

    const psiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params.toString()}`;
    log(`[site-pagespeed] PSI ${strategy}: ${url}`);

    const psiRes = await fetch(psiUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    const psiText = await psiRes.text();
    let psiJson;
    try {
      psiJson = psiText ? JSON.parse(psiText) : {};
    } catch {
      return { ok: false, strategy, message: 'PageSpeed API returned invalid JSON.' };
    }

    if (!psiRes.ok) {
      const msg =
        (psiJson.error && psiJson.error.message) ||
        psiJson.message ||
        `PageSpeed API error (${psiRes.status})`;
      return { ok: false, strategy, message: msg };
    }

    const lr = psiJson.lighthouseResult;
    const categories = lr && lr.categories ? lr.categories : null;
    if (!categories) {
      return { ok: false, strategy, message: 'PageSpeed response had no Lighthouse categories.' };
    }

    const scores = {
      performance: scoreFromCategory(categories, 'performance'),
      accessibility: scoreFromCategory(categories, 'accessibility'),
      bestPractices: scoreFromCategory(categories, 'best-practices'),
      seo: scoreFromCategory(categories, 'seo'),
    };

    return {
      ok: true,
      strategy,
      scores,
      coreWebVitals: extractCoreWebVitals(lr),
      analyzedUrl: psiJson.id || url,
      lighthouseVersion: lr.lighthouseVersion || undefined,
    };
  } catch (e) {
    return { ok: false, strategy, message: e.message || 'PageSpeed request failed.' };
  }
}

module.exports = async ({ req, res, log, error }) => {
  const endpoint = process.env.APPWRITE_ENDPOINT || process.env.APPWRITE_FUNCTION_ENDPOINT || process.env.APPWRITE_FUNCTION_API_ENDPOINT;
  const projectId = process.env.APPWRITE_PROJECT_ID || process.env.APPWRITE_FUNCTION_PROJECT_ID;
  const apiKey = process.env.APPWRITE_API_KEY || process.env.APPWRITE_FUNCTION_API_KEY || process.env.APPWRITE_KEY;
  const psiKey = process.env.GOOGLE_API_KEY;

  if (!endpoint || !projectId || !apiKey) {
    error('[site-pagespeed] Missing Appwrite server env');
    return fail(res, 'Function environment is not configured.', 500);
  }
  if (!psiKey || !String(psiKey).trim()) {
    error('[site-pagespeed] Missing GOOGLE_PAGESPEED_API_KEY (or PAGESPEED_API_KEY) in function env');
    return fail(res, 'PageSpeed API key is not configured on the server.', 503);
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

    const adminClient = new sdk.Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
    const databases = new sdk.Databases(adminClient);

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

    const result = await runPsi(url, psiKey, strategy, log);
    if (!result.ok) {
      return fail(res, result.message || 'PageSpeed analysis failed.', 502);
    }

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
