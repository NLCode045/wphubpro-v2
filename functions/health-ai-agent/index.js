/**
 * health-ai-agent: JWT-authenticated suggest + executeOne for Site Health–driven fixes.
 * suggest: reads site health_meta, optional OpenAI (OPENAI_API_KEY), else heuristic advice_only rows.
 * executeOne: allowlisted bridge calls (health push, plugins, hub/invoke registry handlers).
 */
const sdk = require('node-appwrite');
const fetch = require('node-fetch');
const crypto = require('crypto');

const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || 'platform_db';
const SITES_COLLECTION_ID = process.env.APPWRITE_SITES_COLLECTION_ID || 'sites';

const ALLOWED_KINDS = new Set([
  'health_refresh',
  'plugin_activate',
  'plugin_deactivate',
  'plugin_update',
  'hub_invoke',
  'advice_only',
]);

function parsePayload(req) {
  if (!req) return {};
  let body = req.body;
  if (body && typeof body === 'object') {
    if (body.action || body.siteId || body.site_id || body.jwt || body.step) return body;
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

function decryptApiKey(encrypted, key) {
  if (!encrypted || typeof encrypted !== 'string' || !key) return null;
  const parts = encrypted.split(':');
  if (parts.length !== 3) return null;
  try {
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedBuf = Buffer.from(parts[1], 'hex');
    const tag = Buffer.from(parts[2], 'hex');
    const derivedKey = crypto.createHash('sha256').update(String(key), 'utf8').digest();
    const decipher = crypto.createDecipheriv('aes-256-gcm', derivedKey, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encryptedBuf), decipher.final()]).toString('utf8');
  } catch {
    return null;
  }
}

function isValidJwtFormat(t) {
  const parts = t ? t.split('.') : [];
  return parts.length === 3 && parts.every((p) => p && p.length >= 10);
}

function isMetaEmpty(s) {
  if (!s || typeof s !== 'string') return true;
  const t = s.trim();
  return t.length <= 2 || t === '[]' || t === '{}';
}

function flattenChecks(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') return [];
  const flat = snapshot.checks_flat;
  if (Array.isArray(flat) && flat.length > 0) {
    return flat.filter((c) => c && typeof c === 'object' && typeof c.id === 'string' && c.label);
  }
  const out = [];
  const seen = new Set();
  for (const mod of snapshot.modules || []) {
    for (const c of mod.checks || []) {
      if (!c || typeof c !== 'object' || typeof c.id !== 'string' || !c.label) continue;
      if (seen.has(c.id)) continue;
      seen.add(c.id);
      out.push(c);
    }
  }
  return out;
}

function heuristicSuggestions(snapshot) {
  const checks = flattenChecks(snapshot);
  const notable = checks.filter((c) => {
    const sev = String(c.severity || '').toLowerCase();
    return sev === 'critical' || sev === 'warning';
  });
  return notable.slice(0, 12).map((c, i) => ({
    id: `heuristic-${c.id}-${i}`,
    title: `Review: ${c.label}`,
    description: c.message
      ? String(c.message).replace(/<[^>]+>/g, '').slice(0, 500)
      : 'Open WordPress → Tools → Site Health for details and manual fixes.',
    kind: 'advice_only',
    payload: { healthCheckId: c.id },
  }));
}

function validatePluginFile(plugin) {
  if (!plugin || typeof plugin !== 'string') return 'Missing plugin file path.';
  const p = plugin.trim();
  if (p.length < 5 || p.length > 200) return 'Invalid plugin path length.';
  if (p.includes('..')) return 'Invalid plugin path.';
  if (!p.includes('/')) return 'Plugin must be like folder/plugin.php.';
  if (!/^[a-zA-Z0-9_.\/-]+\.php$/i.test(p)) return 'Plugin path must end in .php and use safe characters.';
  return null;
}

function isProtectedBridgePlugin(plugin) {
  const lower = String(plugin).toLowerCase();
  return lower.includes('wphubpro-bridge') && lower.endsWith('.php');
}

/** Matches bridge HubInvoke handler keys after normalize. */
function validateHubHandlerKey(handler) {
  if (!handler || typeof handler !== 'string') return null;
  const h = handler.trim().toLowerCase();
  if (!/^[a-z0-9_-]{1,64}$/.test(h)) return null;
  return h;
}

/** Plain object args only, size-capped (JSON round-trip). */
function sanitizeHubInvokeArgs(args) {
  if (args == null || typeof args !== 'object' || Array.isArray(args)) return {};
  try {
    const s = JSON.stringify(args);
    if (s.length > 8000) return {};
    const parsed = JSON.parse(s);
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function normalizeSuggestion(raw, index) {
  if (!raw || typeof raw !== 'object') return null;
  const id = String(raw.id || `s-${index}`).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80) || `s-${index}`;
  const title = String(raw.title || '').trim().slice(0, 200);
  const description = String(raw.description || '').trim().slice(0, 2000);
  const kind = String(raw.kind || '').trim();
  if (!title || !ALLOWED_KINDS.has(kind)) return null;
  const payload = raw.payload && typeof raw.payload === 'object' && !Array.isArray(raw.payload) ? { ...raw.payload } : {};
  if (kind === 'plugin_activate' || kind === 'plugin_deactivate' || kind === 'plugin_update') {
    const plugin = String(payload.plugin || '').trim();
    const err = validatePluginFile(plugin);
    if (err) return null;
    if (kind === 'plugin_deactivate' && isProtectedBridgePlugin(plugin)) return null;
    return { id, title, description, kind, payload: { plugin } };
  }
  if (kind === 'hub_invoke') {
    const handler = validateHubHandlerKey(String(payload.handler || ''));
    if (!handler) return null;
    const args = sanitizeHubInvokeArgs(payload.args);
    return { id, title, description, kind, payload: { handler, args } };
  }
  if (kind === 'health_refresh' || kind === 'advice_only') {
    return { id, title, description, kind, payload: {} };
  }
  return null;
}

async function callOpenAiForSuggestions(checksSummary, log) {
  const key = process.env.OPENAI_API_KEY;
  if (!key || typeof key !== 'string' || !key.trim()) return null;

  const system = `You are a WordPress Site Health assistant for WPHub Pro. Given a JSON summary of Site Health checks, propose concrete fixes.
Return a single JSON object with key "suggestions" (array). Each item: id (short slug), title, description, kind, payload.
Allowed kind values ONLY: "advice_only" (no automated change — PHP upgrade, HTTPS, general guidance), "health_refresh" (re-run health push — use when stale data might help), "plugin_deactivate" | "plugin_activate" | "plugin_update" with payload.plugin = exact plugin file path like "akismet/akismet.php" ONLY when the check text clearly names one plugin file or slug you can map safely, "hub_invoke" with payload.handler = a registered bridge handler key (lowercase a-z, 0-9, underscore, hyphen; e.g. "site_summary", "ping") and optional payload.args object — ONLY when the site owner may have registered that handler via wphubpro_hub_invoke_handlers; prefer built-in "ping" or "site_summary" for diagnostics, never invent risky handler names.
Never target WPHub Pro Bridge (paths containing wphubpro-bridge). Max 8 suggestions. Prefer advice_only when unsure.`;

  const userContent = JSON.stringify({ checks: checksSummary });

  try {
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: userContent },
        ],
      }),
    });
    const text = await resp.text();
    if (!resp.ok) {
      log(`[health-ai-agent] OpenAI HTTP ${resp.status}: ${text.slice(0, 200)}`);
      return null;
    }
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      return null;
    }
    const content = parsed?.choices?.[0]?.message?.content;
    if (!content || typeof content !== 'string') return null;
    let obj;
    try {
      obj = JSON.parse(content);
    } catch {
      return null;
    }
    const arr = Array.isArray(obj.suggestions) ? obj.suggestions : [];
    const normalized = [];
    const seen = new Set();
    for (let i = 0; i < arr.length; i++) {
      const n = normalizeSuggestion(arr[i], i);
      if (n && !seen.has(n.id)) {
        seen.add(n.id);
        normalized.push(n);
      }
    }
    return normalized.length > 0 ? normalized : null;
  } catch (e) {
    log(`[health-ai-agent] OpenAI error: ${e.message}`);
    return null;
  }
}

function getBridgeSecretFromSite(siteDoc, ENCRYPTION_KEY) {
  let storedKey = siteDoc.api_key ?? siteDoc.apiKey ?? siteDoc.bridge_secret ?? '';
  if (siteDoc.data && typeof siteDoc.data === 'object') {
    storedKey = storedKey || siteDoc.data.api_key || siteDoc.data.apiKey || siteDoc.data.bridge_secret || '';
  }
  const looksEncrypted =
    storedKey && typeof storedKey === 'string' && storedKey.includes(':') && storedKey.split(':').length === 3;
  let bridgeSecret = typeof storedKey === 'string' ? storedKey.trim() : '';
  if (storedKey && looksEncrypted) {
    const decrypted = decryptApiKey(storedKey, ENCRYPTION_KEY);
    if (decrypted && typeof decrypted === 'string' && decrypted.trim()) {
      bridgeSecret = decrypted.trim();
    } else {
      return null;
    }
  }
  return bridgeSecret || null;
}

function validateExecuteStep(step) {
  return normalizeSuggestion(step, 0);
}

async function wpProxyRequest(siteDoc, bridgeSecret, { path, method, jsonBody }, log) {
  const siteUrl = (siteDoc.site_url || siteDoc.siteUrl || '').trim().replace(/\/$/, '');
  if (!siteUrl) return { ok: false, message: 'Site has no URL.', httpStatus: 0 };
  const base = siteUrl.startsWith('http') ? siteUrl : `https://${siteUrl}`;
  const url = `${base}/wp-json/${path.replace(/^\/+/, '')}`;
  const wpAdminLogin = (siteDoc.username || siteDoc.user_login || '').toString().trim();
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'X-WPHub-Key': bridgeSecret,
    'User-Agent': 'WPHub-HealthAiAgent/1.0',
  };
  if ((path.includes('plugins/manage/') || path.includes('hub/invoke')) && wpAdminLogin) {
    headers['X-WPHub-Admin-Login'] = wpAdminLogin;
  }
  const bodyObj = { ...jsonBody, bridge_secret: bridgeSecret };
  try {
    const resp = await fetch(url, {
      method,
      headers,
      body: JSON.stringify(bodyObj),
      timeout: 60000,
    });
    const httpStatus = resp.status;
    const text = await resp.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text.slice(0, 500) };
    }
    if (httpStatus >= 200 && httpStatus < 300) {
      let msg = 'OK';
      if (data && typeof data === 'object') {
        if (typeof data.message === 'string' && data.message) {
          msg = data.message;
        } else if (data.success === true && typeof data.handler === 'string' && data.handler) {
          msg = `Handler “${data.handler}” completed.`;
        }
      }
      return { ok: true, message: msg, httpStatus };
    }
    const msg =
      data && typeof data === 'object' && typeof data.message === 'string'
        ? data.message
        : `WordPress returned HTTP ${httpStatus}`;
    return { ok: false, message: msg, httpStatus, details: data };
  } catch (e) {
    log(`[health-ai-agent] fetch error: ${e.message}`);
    return { ok: false, message: e.message || String(e), httpStatus: 0 };
  }
}

async function runExecuteOne(siteDoc, ENCRYPTION_KEY, step, log) {
  const validated = validateExecuteStep(step);
  if (!validated) {
    return { json: { success: false, message: 'Invalid or disallowed step.' }, status: 400 };
  }
  if (validated.kind === 'advice_only') {
    return { json: { success: true, skipped: true, message: 'No change applied (advisory only).' }, status: 200 };
  }

  const bridgeSecret = getBridgeSecretFromSite(siteDoc, ENCRYPTION_KEY);
  if (!bridgeSecret) {
    return { json: { success: false, message: 'Could not resolve site API key.' }, status: 400 };
  }

  let path;
  let method = 'POST';
  let jsonBody = {};
  switch (validated.kind) {
    case 'health_refresh':
      path = 'wphubpro/v1/health/push';
      jsonBody = {};
      break;
    case 'plugin_activate':
      path = 'wphubpro/v1/plugins/manage/activate';
      jsonBody = { plugin: validated.payload.plugin };
      break;
    case 'plugin_deactivate':
      if (isProtectedBridgePlugin(validated.payload.plugin)) {
        return { json: { success: false, message: 'Cannot deactivate WPHub Pro Bridge from the hub.' }, status: 403 };
      }
      path = 'wphubpro/v1/plugins/manage/deactivate';
      jsonBody = { plugin: validated.payload.plugin };
      break;
    case 'plugin_update':
      path = 'wphubpro/v1/plugins/manage/update';
      jsonBody = { plugin: validated.payload.plugin };
      break;
    case 'hub_invoke': {
      const h = validated.payload?.handler;
      const invokeArgs =
        validated.payload?.args && typeof validated.payload.args === 'object' && !Array.isArray(validated.payload.args)
          ? validated.payload.args
          : {};
      path = 'wphubpro/v1/hub/invoke';
      jsonBody = { handler: h, args: invokeArgs };
      break;
    }
    default:
      return { json: { success: false, message: 'Unsupported action.' }, status: 400 };
  }

  const result = await wpProxyRequest(siteDoc, bridgeSecret, { path, method, jsonBody }, log);
  if (result.ok) {
    return {
      json: { success: true, message: result.message, httpStatus: result.httpStatus },
      status: 200,
    };
  }
  return {
    json: {
      success: false,
      message: result.message,
      httpStatus: result.httpStatus,
      details: result.details,
    },
    status: result.httpStatus >= 400 && result.httpStatus < 600 ? 502 : 500,
  };
}

module.exports = async ({ req, res, log, error }) => {
  const endpoint = process.env.APPWRITE_ENDPOINT || process.env.APPWRITE_FUNCTION_ENDPOINT;
  const projectId = process.env.APPWRITE_PROJECT_ID || process.env.APPWRITE_FUNCTION_PROJECT_ID;
  const apiKey = process.env.APPWRITE_API_KEY || process.env.APPWRITE_FUNCTION_API_KEY || process.env.APPWRITE_KEY;
  const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

  if (!endpoint || !projectId || !apiKey) {
    return fail(res, 'Function environment is not configured.', 500);
  }
  if (!ENCRYPTION_KEY) {
    return fail(res, 'Function environment is not configured. Missing: ENCRYPTION_KEY.', 500);
  }

  let body = {};
  try {
    body = parsePayload(req);
  } catch (e) {
    return fail(res, 'Invalid JSON body.', 400);
  }

  const action = String(body.action || '').trim();
  const siteIdManual = body.siteId || body.site_id;
  const authHeader =
    req.headers?.authorization ||
    req.headers?.Authorization ||
    req.headers?.['x-appwrite-user-jwt'] ||
    req.headers?.['x-appwrite-jwt'] ||
    '';
  const headerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : authHeader.trim();
  const bodyToken = typeof body.jwt === 'string' ? body.jwt.trim() : '';
  const token = isValidJwtFormat(bodyToken)
    ? bodyToken
    : isValidJwtFormat(headerToken)
      ? headerToken
      : headerToken || bodyToken;

  if (!siteIdManual) {
    return fail(res, 'Missing siteId.', 400);
  }
  if (!token || !isValidJwtFormat(token)) {
    return fail(res, 'Missing or invalid JWT.', 401);
  }

  const adminClient = new sdk.Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
  const databases = new sdk.Databases(adminClient);

  let jwtUser;
  try {
    const jwtClient = new sdk.Client().setEndpoint(endpoint).setProject(projectId).setJWT(token);
    const account = new sdk.Account(jwtClient);
    jwtUser = await account.get();
  } catch (e) {
    log(`[health-ai-agent] JWT verification failed: ${e.message}`);
    return fail(res, 'Invalid or expired JWT.', 401);
  }
  const userId = jwtUser?.$id;
  if (!userId) {
    return fail(res, 'Could not determine user from JWT.', 401);
  }

  let siteDoc;
  try {
    siteDoc = await databases.getDocument(DATABASE_ID, SITES_COLLECTION_ID, siteIdManual);
  } catch (e) {
    if (e.code === 404) {
      return fail(res, 'Site not found.', 404);
    }
    throw e;
  }

  const siteUserId = siteDoc.user_id || siteDoc.userId;
  if (siteUserId !== userId) {
    return fail(res, 'Site does not belong to this user.', 403);
  }

  if (action === 'suggest') {
    const healthRaw = siteDoc.health_meta ?? siteDoc.healthMeta ?? '';
    if (isMetaEmpty(healthRaw)) {
      return ok(res, {
        success: true,
        suggestions: [
          {
            id: 'no-health-data',
            title: 'Run a health check first',
            description:
              'There is no Site Health snapshot yet. Use “Check health” on this page, then open the assistant again.',
            kind: 'advice_only',
            payload: {},
          },
        ],
        source: 'heuristic',
      });
    }

    let snapshot;
    try {
      snapshot = JSON.parse(String(healthRaw).trim());
    } catch (e) {
      return fail(res, 'Stored health_meta is not valid JSON.', 500);
    }

    const checks = flattenChecks(snapshot);
    const checksSummary = checks
      .filter((c) => {
        const sev = String(c.severity || '').toLowerCase();
        return sev === 'critical' || sev === 'warning' || sev === 'ok';
      })
      .slice(0, 40)
      .map((c) => ({
        id: c.id,
        label: c.label,
        severity: c.severity,
        message: typeof c.message === 'string' ? c.message.replace(/<[^>]+>/g, '').slice(0, 400) : '',
      }));

    let aiList = await callOpenAiForSuggestions(checksSummary, log);
    let source = 'openai';
    if (!aiList || aiList.length === 0) {
      aiList = heuristicSuggestions(snapshot);
      source = 'heuristic';
    }

    const refreshHint = {
      id: 'health-refresh-helper',
      title: 'Refresh Site Health data from WordPress',
      description:
        'Pushes a fresh health snapshot from the site to the hub (safe). Useful before or after other changes.',
      kind: 'health_refresh',
      payload: {},
    };

    const hasRefresh = aiList.some((s) => s.kind === 'health_refresh');
    const merged = hasRefresh ? [...aiList] : [refreshHint, ...aiList];

    return ok(res, { success: true, suggestions: merged, source });
  }

  if (action === 'executeOne') {
    const step = body.step;
    try {
      const out = await runExecuteOne(siteDoc, ENCRYPTION_KEY, step, log);
      return res.json(out.json, out.status);
    } catch (e) {
      error(`[health-ai-agent] executeOne: ${e.message}`);
      return fail(res, e.message || 'Execute failed.', 500);
    }
  }

  return fail(res, 'Unknown action. Use suggest or executeOne.', 400);
};
