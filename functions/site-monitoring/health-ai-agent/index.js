/**
 * health-ai-agent: JWT-authenticated suggest, executeOne, and dryRun for Site Health–driven fixes.
 * suggest: site health_meta + plugins_meta/themes_meta, optional Gemini (via openai-gateway), else heuristic advice_only rows.
 * executeOne: allowlisted bridge calls (health push, plugins, themes, hub/invoke registry handlers).
 * dryRun: analyze/plan from hub-stored meta only — no WordPress HTTP calls; plan validates like executeOne.
 */
const sdk = require('node-appwrite');
const fetch = require('node-fetch');
const crypto = require('crypto');
const { getAppwriteBootstrap, hasAppwriteBootstrap } = require('../../subscriptions/stripe-consumer/lib/appwriteEnv');
const { createServerClientAndDatabases } = require('../../database/fetchAppwriteCredentialsFromGateway');

const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || 'platform_db';
const SITES_COLLECTION_ID = process.env.APPWRITE_SITES_COLLECTION_ID || 'sites';

const ALLOWED_KINDS = new Set([
  'health_refresh',
  'plugin_activate',
  'plugin_deactivate',
  'plugin_update',
  'plugin_uninstall',
  'theme_activate',
  'theme_update',
  'theme_delete',
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

/**
 * Call openai-gateway to generate Gemini content suggestions
 */
async function callOpenAIGateway(action, payload, log, error, endpoint, projectId, apiKey) {
  const gatewayClient = new sdk.Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);

  const functions = new sdk.Functions(gatewayClient);
  const gatewayFunctionId = process.env.OPENAI_GATEWAY_FUNCTION_ID || 'openai-gateway';

  try {
    const response = await functions.createExecution(
      gatewayFunctionId,
      JSON.stringify({ action, payload }),
      true
    );

    if (!response.responseBody) {
      throw new Error('No response from openai-gateway');
    }

    const result = typeof response.responseBody === 'string'
      ? JSON.parse(response.responseBody)
      : response.responseBody;

    if (!result.success) {
      throw new Error(result.message || 'Gateway operation failed');
    }

    return result;
  } catch (err) {
    error(`openai-gateway call failed: ${err.message}`);
    throw err;
  }
}
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

/**
 * Prefer request body overrides, then Appwrite site document fields.
 */
function resolveMetaStrings(siteDoc, body) {
  const pick = (bKey, dKeyAlt, dKey) => {
    const fromBody = body && typeof body === 'object' ? body[bKey] : undefined;
    if (typeof fromBody === 'string' && fromBody.trim().length > 2) return fromBody.trim();
    const v = siteDoc[dKeyAlt] ?? siteDoc[dKey] ?? '';
    return typeof v === 'string' ? v.trim() : '';
  };
  return {
    health: pick('health_meta', 'healthMeta', 'health_meta'),
    plugins: pick('plugins_meta', 'pluginsMeta', 'plugins_meta'),
    themes: pick('themes_meta', 'themesMeta', 'themes_meta'),
  };
}

function parsePluginsMetaArray(raw) {
  if (!raw || typeof raw !== 'string' || raw.length < 2) return [];
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr
      .map((p) => {
        if (!p || typeof p !== 'object') return null;
        const file = String(p.file ?? p.plugin ?? '').trim();
        const name = String(p.name ?? '').trim();
        const active = p.active === true || p.active === 1 || p.status === 'active';
        const update = p.update != null && String(p.update).trim() !== '' ? String(p.update).trim() : null;
        if (!file) return null;
        return { file, name, active, update };
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

function parseThemesMetaArray(raw) {
  if (!raw || typeof raw !== 'string' || raw.length < 2) return [];
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr
      .map((t) => {
        if (!t || typeof t !== 'object') return null;
        const slug = String(t.stylesheet ?? t.file ?? t.slug ?? '').trim();
        const name = String(t.name ?? '').trim();
        const active = t.active === true || t.active === 1 || t.status === 'active';
        const update = t.update != null && String(t.update).trim() !== '' ? String(t.update).trim() : null;
        if (!slug) return null;
        return { slug, name, active, update };
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

function buildDryRunAnalyzeSummary(siteDoc, body) {
  const meta = resolveMetaStrings(siteDoc, body);
  const warnings = [];
  let hasHealthSnapshot = false;
  let criticalOrWarningChecks = 0;
  if (!isMetaEmpty(meta.health)) {
    try {
      const snapshot = JSON.parse(meta.health);
      hasHealthSnapshot = true;
      const checks = flattenChecks(snapshot);
      criticalOrWarningChecks = checks.filter((c) => {
        const sev = String(c.severity || '').toLowerCase();
        return sev === 'critical' || sev === 'warning';
      }).length;
    } catch {
      warnings.push('health_meta could not be parsed; Site Health counts may be missing.');
    }
  } else {
    warnings.push('No Site Health snapshot in the hub. Run Check health for richer analysis.');
  }

  const plugins = parsePluginsMetaArray(meta.plugins);
  const themes = parseThemesMetaArray(meta.themes);
  if (plugins.length === 0 && !isMetaEmpty(meta.plugins)) {
    warnings.push('plugins_meta is present but could not be parsed.');
  }
  if (themes.length === 0 && !isMetaEmpty(meta.themes)) {
    warnings.push('themes_meta is present but could not be parsed.');
  }
  if (plugins.length === 0 && isMetaEmpty(meta.plugins)) {
    warnings.push('No plugins_meta on this site; sync plugins from WordPress or open the site in the hub to refresh metadata.');
  }

  const inactivePlugins = plugins.filter((p) => !p.active).map((p) => ({ file: p.file, name: p.name || p.file }));
  const inactiveThemes = themes.filter((t) => !t.active).map((t) => ({ slug: t.slug, name: t.name || t.slug }));
  const pluginsWithUpdates = plugins.filter((p) => p.update).map((p) => ({ file: p.file, name: p.name || p.file }));
  const inactiveThemesWithUpdates = themes
    .filter((t) => !t.active && t.update)
    .map((t) => ({ slug: t.slug, name: t.name || t.slug }));

  return {
    summary: {
      hasHealthSnapshot,
      criticalOrWarningChecks,
      inactivePlugins,
      inactiveThemes,
      pluginsWithUpdates,
      inactiveThemesWithUpdates,
    },
    warnings,
  };
}

function clampInt(n, min, max, fallback) {
  const x = parseInt(String(n), 10);
  if (Number.isNaN(x)) return fallback;
  return Math.min(max, Math.max(min, x));
}

/**
 * Heuristic plan from questionnaire + analyze summary (no bridge calls).
 */
function buildDryRunPlanFromAnswers(summary, answers) {
  const warnings = [];
  const steps = [];
  let stepIdx = 0;
  const add = (step) => {
    const n = normalizeSuggestion(step, stepIdx++);
    if (n) steps.push({ ...n, simulated: true });
  };

  const a = answers && typeof answers === 'object' ? answers : {};

  if (a.includeHealthRefresh !== false) {
    add({
      id: 'plan-health-refresh',
      title: 'Refresh Site Health snapshot from WordPress',
      description: 'Pushes a fresh health snapshot to the hub (safe).',
      kind: 'health_refresh',
      payload: {},
    });
  }

  if (a.flushCaches) {
    add({
      id: 'plan-flush-caches',
      title: 'Flush object cache and expired transients',
      description: 'Runs hub handler maintenance_flush_caches on the bridge.',
      kind: 'hub_invoke',
      payload: { handler: 'maintenance_flush_caches', args: {} },
    });
  }

  if (a.optimizeDatabase) {
    add({
      id: 'plan-db-optimize',
      title: 'Optimize database tables (WordPress prefix)',
      description: 'Runs hub handler maintenance_optimize_db. Large databases may take time.',
      kind: 'hub_invoke',
      payload: { handler: 'maintenance_optimize_db', args: {} },
    });
  }

  if (a.purgeSpamComments) {
    const limit = clampInt(a.spamCommentLimit, 1, 2000, 200);
    add({
      id: 'plan-purge-spam',
      title: `Permanently delete up to ${limit} spam comments`,
      description: 'Runs maintenance_purge_spam_comments on the bridge.',
      kind: 'hub_invoke',
      payload: { handler: 'maintenance_purge_spam_comments', args: { limit } },
    });
  }

  const sv = String(a.searchVisibility || 'unchanged');
  if (sv === 'allow') {
    add({
      id: 'plan-search-allow',
      title: 'Allow search engines to index the site',
      description: 'Sets blog_public so search engines are not discouraged.',
      kind: 'hub_invoke',
      payload: { handler: 'reading_search_visibility', args: { discourage: false } },
    });
  } else if (sv === 'discourage') {
    add({
      id: 'plan-search-discourage',
      title: 'Discourage search engines from indexing the site',
      description: 'Sets Reading → Search engine visibility to discourage indexing.',
      kind: 'hub_invoke',
      payload: { handler: 'reading_search_visibility', args: { discourage: true } },
    });
  }

  if (a.runPluginUpdates) {
    const cap = clampInt(a.maxPluginUpdates, 1, 50, 10);
    const list = (summary.pluginsWithUpdates || []).slice(0, cap);
    if (list.length === 0) warnings.push('No plugins with available updates in synced plugins_meta.');
    list.forEach((p, i) => {
      add({
        id: `plan-plugin-up-${i}`,
        title: `Update plugin: ${p.name}`,
        description: `Would update ${p.file}`,
        kind: 'plugin_update',
        payload: { plugin: p.file },
      });
    });
  }

  if (a.removeInactivePlugins) {
    const cap = clampInt(a.maxInactivePluginsToRemove, 1, 30, 5);
    const list = (summary.inactivePlugins || []).filter((p) => !isProtectedBridgePlugin(p.file)).slice(0, cap);
    if (list.length === 0) warnings.push('No inactive plugins to remove (or only the bridge is inactive).');
    list.forEach((p, i) => {
      add({
        id: `plan-plugin-un-${i}`,
        title: `Uninstall inactive plugin: ${p.name}`,
        description: `Would uninstall ${p.file} (deactivate, uninstall hook, delete files).`,
        kind: 'plugin_uninstall',
        payload: { plugin: p.file },
      });
    });
  }

  if (a.removeInactiveThemes) {
    const cap = clampInt(a.maxInactiveThemesToRemove, 1, 20, 3);
    const list = (summary.inactiveThemes || []).slice(0, cap);
    if (list.length === 0) warnings.push('No inactive themes in synced themes_meta.');
    else warnings.push('Deleting themes can break child themes; confirm in WordPress before running.');
    list.forEach((t, i) => {
      const slug = validateThemeSlug(t.slug);
      if (!slug) return;
      add({
        id: `plan-theme-del-${i}`,
        title: `Delete inactive theme: ${t.name}`,
        description: `Would delete theme slug ${slug}`,
        kind: 'theme_delete',
        payload: { theme: slug },
      });
    });
  }

  if (a.runThemeUpdatesForInactive) {
    const cap = clampInt(a.maxThemeUpdates, 1, 20, 5);
    const list = (summary.inactiveThemesWithUpdates || []).slice(0, cap);
    if (list.length === 0) warnings.push('No inactive themes with updates in synced themes_meta.');
    list.forEach((t, i) => {
      const slug = validateThemeSlug(t.slug);
      if (!slug) return;
      add({
        id: `plan-theme-up-${i}`,
        title: `Update inactive theme: ${t.name}`,
        description: `Would update theme ${slug}`,
        kind: 'theme_update',
        payload: { theme: slug },
      });
    });
  }

  return { plannedSteps: steps, warnings };
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

function validateThemeSlug(slug) {
  if (!slug || typeof slug !== 'string') return null;
  const s = slug.trim();
  if (s.length < 1 || s.length > 120) return null;
  if (!/^[a-zA-Z0-9_-]+$/.test(s)) return null;
  return s;
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
  if (
    kind === 'plugin_activate' ||
    kind === 'plugin_deactivate' ||
    kind === 'plugin_update' ||
    kind === 'plugin_uninstall'
  ) {
    const plugin = String(payload.plugin || '').trim();
    const err = validatePluginFile(plugin);
    if (err) return null;
    if ((kind === 'plugin_deactivate' || kind === 'plugin_uninstall') && isProtectedBridgePlugin(plugin)) {
      return null;
    }
    return { id, title, description, kind, payload: { plugin } };
  }
  if (kind === 'theme_activate' || kind === 'theme_update' || kind === 'theme_delete') {
    const theme = validateThemeSlug(String(payload.theme || payload.slug || ''));
    if (!theme) return null;
    return { id, title, description, kind, payload: { theme } };
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

async function callGeminiForSuggestions(checksSummary, extras, log, error, endpoint, projectId, apiKey) {
  const system = `You are a WordPress Site Health assistant for WPHub Pro. Given Site Health checks and optional plugin/theme lists from the hub, propose concrete fixes.
Return a single JSON object with key "suggestions" (array). Each item: id (short slug), title, description, kind, payload.
Allowed kind values ONLY:
- "advice_only" — no automated change (PHP upgrade, HTTPS, ambiguous guidance).
- "health_refresh" — re-push Site Health snapshot when stale data might help.
- "plugin_activate" | "plugin_deactivate" | "plugin_update" | "plugin_uninstall" with payload.plugin = exact file path like "akismet/akismet.php" only when clearly justified; for uninstall only inactive plugins from the provided plugins list; never uninstall the WPHub Pro Bridge (paths containing wphubpro-bridge).
- "theme_activate" | "theme_update" | "theme_delete" with payload.theme = stylesheet slug from the themes list (inactive themes only for delete).
- "hub_invoke" with payload.handler and optional payload.args. Built-in handlers include: "ping", "site_summary", "maintenance_flush_caches", "maintenance_optimize_db", "maintenance_purge_spam_comments" (args.limit number 1-2000), "reading_search_visibility" (args.discourage boolean). Prefer safe diagnostics when unsure.
Max 8 suggestions. Prefer advice_only when unsure.`;

  const userContent = JSON.stringify({
    checks: checksSummary,
    plugins: (extras && extras.plugins) || [],
    themes: (extras && extras.themes) || [],
  });

  try {
    const gatewayResult = await callOpenAIGateway(
      'generate-content',
      {
        model: 'gemini-2.0-flash',
        messages: [
          {
            role: 'user',
            content: `Site Health checks JSON:\n${userContent}`,
          },
        ],
        systemPrompt: system,
      },
      log,
      error,
      endpoint,
      projectId,
      apiKey
    );

    if (!gatewayResult.content) {
      log('[health-ai-agent] Gateway returned no content');
      return null;
    }

    let rawText = String(gatewayResult.content).trim();
    if (rawText.startsWith('```')) {
      rawText = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
    }

    let obj;
    try {
      obj = JSON.parse(rawText);
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
    log(`[health-ai-agent] Content generation error: ${e.message}`);
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
  if (
    (path.includes('plugins/manage/') ||
      path.includes('themes/manage/') ||
      path.includes('hub/invoke')) &&
    wpAdminLogin
  ) {
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
    case 'plugin_uninstall':
      if (isProtectedBridgePlugin(validated.payload.plugin)) {
        return { json: { success: false, message: 'Cannot uninstall WPHub Pro Bridge from the hub.' }, status: 403 };
      }
      path = 'wphubpro/v1/plugins/manage/uninstall';
      jsonBody = { plugin: validated.payload.plugin };
      break;
    case 'theme_activate':
      path = 'wphubpro/v1/themes/manage/activate';
      jsonBody = { slug: validated.payload.theme };
      break;
    case 'theme_update':
      path = 'wphubpro/v1/themes/manage/update';
      jsonBody = { slug: validated.payload.theme };
      break;
    case 'theme_delete':
      path = 'wphubpro/v1/themes/manage/delete';
      jsonBody = { slug: validated.payload.theme };
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
  const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
  const bootstrap = getAppwriteBootstrap();

  if (!hasAppwriteBootstrap()) {
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

  let databases;
  let gwEndpoint;
  let gwProjectId;
  try {
    ({ databases, endpoint: gwEndpoint, projectId: gwProjectId } = await createServerClientAndDatabases(
      log,
      error,
    ));
  } catch (e) {
    error(`[health-ai-agent] ${e.message}`);
    return fail(res, 'Could not resolve Appwrite credentials.', 500);
  }

  let jwtUser;
  try {
    const jwtClient = new sdk.Client().setEndpoint(gwEndpoint).setProject(gwProjectId).setJWT(token);
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

    const metaCtx = resolveMetaStrings(siteDoc, body);
    const pluginsCtx = parsePluginsMetaArray(metaCtx.plugins).slice(0, 80).map((p) => ({
      file: p.file,
      name: p.name,
      active: p.active,
      update: p.update,
    }));
    const themesCtx = parseThemesMetaArray(metaCtx.themes).slice(0, 60).map((t) => ({
      slug: t.slug,
      name: t.name,
      active: t.active,
      update: t.update,
    }));

    let aiList = await callGeminiForSuggestions(
      checksSummary,
      { plugins: pluginsCtx, themes: themesCtx },
      log,
      error,
      bootstrap.endpoint,
      bootstrap.projectId,
      bootstrap.apiKey,
    );
    let source = 'gemini';

    // If initial call fails, try again (fallback behavior)
    if (!aiList) {
      try {
        aiList = await callGeminiForSuggestions(
          checksSummary,
          { plugins: pluginsCtx, themes: themesCtx },
          log,
          error,
          bootstrap.endpoint,
          bootstrap.projectId,
          bootstrap.apiKey,
        );
        source = 'gemini';
      } catch (err) {
        log(`[health-ai-agent] Could not generate AI suggestions: ${err.message}`);
      }
    }

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

  if (action === 'dryRun') {
    const phase = String(body.dryRunPhase || body.phase || 'analyze')
      .trim()
      .toLowerCase();
    if (phase === 'analyze') {
      const { summary, warnings } = buildDryRunAnalyzeSummary(siteDoc, body);
      return ok(res, { success: true, phase: 'analyze', summary, warnings });
    }
    if (phase === 'plan') {
      const { summary, warnings: analyzeWarnings } = buildDryRunAnalyzeSummary(siteDoc, body);
      const answers =
        body.answers && typeof body.answers === 'object' && !Array.isArray(body.answers) ? body.answers : {};
      const { plannedSteps, warnings: planWarnings } = buildDryRunPlanFromAnswers(summary, answers);
      const warnings = [...(analyzeWarnings || []), ...(planWarnings || [])];
      return ok(res, {
        success: true,
        phase: 'plan',
        plannedSteps,
        warnings,
        answersEcho: answers,
      });
    }
    return fail(res, 'dryRunPhase must be "analyze" or "plan".', 400);
  }

  return fail(res, 'Unknown action. Use suggest, executeOne, or dryRun.', 400);
};
