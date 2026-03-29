/**
 * site-app-icon-preview: GET public homepage HTML for a user-owned site and resolve a brand image:
 * 1) <img id="app-icon-preview" src|data-src="...">
 * 2) <link rel="apple-touch-icon" href="...">
 * 3) <link rel="icon"> (prefer largest sizes / filename dimensions)
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

function normalizeUrl(raw) {
  if (!raw || typeof raw !== 'string') return '';
  const t = raw.trim();
  if (!t) return '';
  if (/^https?:\/\//i.test(t)) return t.replace(/\/$/, '');
  return `https://${t.replace(/\/$/, '')}`;
}

function decodeBasicEntities(s) {
  if (!s) return s;
  return s
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;/g, "'")
    .replace(/&apos;/gi, "'");
}

/**
 * @param {string} tag
 * @returns {number} rough pixel score for choosing best favicon
 */
function linkIconSizeScore(tag) {
  const sm = /\bsizes\s*=\s*["']([^"']+)["']/i.exec(tag);
  if (sm) {
    const first = sm[1].trim().split(/\s+/)[0];
    const dim = /^(\d+)x(\d+)$/i.exec(first);
    if (dim) return Math.max(parseInt(dim[1], 10), parseInt(dim[2], 10));
  }
  const hrefM = /\bhref\s*=\s*["']([^"']+)["']/i.exec(tag);
  if (hrefM) {
    const u = hrefM[1];
    const m = /-(\d+)x(\d+)\.(png|jpg|jpeg|webp|ico)(\?|$)/i.exec(u);
    if (m) return Math.max(parseInt(m[1], 10), parseInt(m[2], 10));
  }
  return 0;
}

/**
 * @param {string} html
 * @returns {string|null}
 */
function extractAppIconSrc(html) {
  if (!html || typeof html !== 'string') return null;
  const imgRe = /<img\b[^>]*>/gi;
  let m;
  while ((m = imgRe.exec(html)) !== null) {
    const tag = m[0];
    if (!/\bid\s*=\s*(["']?)app-icon-preview\1/i.test(tag)) continue;
    let sm = /\bsrc\s*=\s*["']([^"']+)["']/i.exec(tag);
    if (sm) return decodeBasicEntities(sm[1].trim());
    sm = /\bsrc\s*=\s*([^\s>]+)/i.exec(tag);
    if (sm) return decodeBasicEntities(sm[1].replace(/^["']|["']$/g, '').trim());
    sm = /\bdata-src\s*=\s*["']([^"']+)["']/i.exec(tag);
    if (sm) return decodeBasicEntities(sm[1].trim());
  }
  return null;
}

/**
 * WordPress / most sites expose brand icons via link tags; `#app-icon-preview` is often absent in served HTML.
 * @returns {{ src: string, source: string } | null}
 */
function extractBrandIconFromHtml(html) {
  if (!html || typeof html !== 'string') return null;

  const fromImg = extractAppIconSrc(html);
  if (fromImg) return { src: fromImg, source: 'app-icon-preview' };

  const linkRe = /<link\b[^>]*>/gi;
  let lm;
  let bestIcon = /** @type {{ href: string; score: number } | null} */ (null);
  let apple = /** @type {string | null} */ (null);

  while ((lm = linkRe.exec(html)) !== null) {
    const tag = lm[0];
    const relM = /\brel\s*=\s*["']([^"']+)["']/i.exec(tag);
    if (!relM) continue;
    const rel = relM[1].toLowerCase().trim();
    const hrefM = /\bhref\s*=\s*["']([^"']+)["']/i.exec(tag);
    if (!hrefM) continue;
    const href = decodeBasicEntities(hrefM[1].trim());
    if (!href) continue;

    if (rel === 'apple-touch-icon' || rel === 'apple-touch-icon-precomposed') {
      if (!apple) apple = href;
      continue;
    }
    const isIcon =
      rel === 'icon' ||
      rel === 'shortcut icon' ||
      rel.split(/\s+/).includes('icon');
    if (isIcon) {
      const score = linkIconSizeScore(tag);
      if (!bestIcon || score > bestIcon.score) bestIcon = { href, score };
    }
  }

  if (apple) return { src: apple, source: 'apple-touch-icon' };
  if (bestIcon) return { src: bestIcon.href, source: 'icon' };
  return null;
}

/**
 * @param {string} baseUrl normalized origin+path base
 * @param {string} src
 */
function resolveSrc(baseUrl, src) {
  if (!src) return null;
  const s = src.trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith('//')) return `https:${s}`;
  try {
    const base = new URL(baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`);
    return new URL(s, base).href;
  } catch {
    return null;
  }
}

const MAX_HTML = 600000;
const FETCH_MS = 14000;

/**
 * @param {string} siteUrl
 * @param {(s:string)=>void} log
 */
async function fetchAndExtract(siteUrl, log) {
  const root = siteUrl.endsWith('/') ? siteUrl : `${siteUrl}/`;
  const candidates = [root, `${siteUrl.replace(/\/$/, '')}/index.html`];
  const tried = new Set();

  for (const pageUrl of candidates) {
    if (tried.has(pageUrl)) continue;
    tried.add(pageUrl);
    try {
      const res = await fetch(pageUrl, {
        method: 'GET',
        redirect: 'follow',
        headers: {
          Accept: 'text/html,application/xhtml+xml',
          'User-Agent': 'WPHubPro/1.0 (+https://wphub.pro; site app-icon preview)',
        },
        signal: AbortSignal.timeout(FETCH_MS),
      });
      const text = await res.text();
      if (!res.ok) {
        log(`[site-app-icon-preview] ${pageUrl} -> ${res.status}`);
        continue;
      }
      const slice = text.length > MAX_HTML ? text.slice(0, MAX_HTML) : text;
      const brand = extractBrandIconFromHtml(slice);
      if (!brand) {
        log(`[site-app-icon-preview] no brand icon markers in ${pageUrl}`);
        continue;
      }
      const absolute = resolveSrc(res.url || pageUrl, brand.src);
      if (absolute) {
        log(`[site-app-icon-preview] found ${brand.source} for ${siteUrl}`);
        return { src: absolute, fetchedUrl: res.url || pageUrl, source: brand.source };
      }
    } catch (e) {
      log(`[site-app-icon-preview] fetch ${pageUrl}: ${e.message}`);
    }
  }
  return null;
}

module.exports = async ({ req, res, log, error }) => {
  const endpoint = process.env.APPWRITE_ENDPOINT || process.env.APPWRITE_FUNCTION_ENDPOINT;
  const projectId = process.env.APPWRITE_PROJECT_ID || process.env.APPWRITE_FUNCTION_PROJECT_ID;
  const apiKey = process.env.APPWRITE_API_KEY || process.env.APPWRITE_FUNCTION_API_KEY || process.env.APPWRITE_KEY;

  if (!endpoint || !projectId || !apiKey) {
    error('[site-app-icon-preview] Missing Appwrite server env');
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
    const jwtClient = new sdk.Client().setEndpoint(endpoint).setProject(projectId).setJWT(token);
    const account = new sdk.Account(jwtClient);
    let jwtUser;
    try {
      jwtUser = await account.get();
    } catch (e) {
      log(`[site-app-icon-preview] JWT failed: ${e.message}`);
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
      return fail(res, 'Site has no URL.', 400);
    }

    const found = await fetchAndExtract(url, log);
    if (!found || !found.src) {
      return ok(res, {
        success: false,
        message:
          'No site icon found (no #app-icon-preview, apple-touch-icon, or rel=icon on the homepage /index.html).',
      });
    }

    return ok(res, {
      success: true,
      src: found.src,
      fetchedUrl: found.fetchedUrl,
      source: found.source,
    });
  } catch (e) {
    error(`[site-app-icon-preview] ${e.message}`);
    return fail(res, e.message || 'Request failed.', 500);
  }
};
