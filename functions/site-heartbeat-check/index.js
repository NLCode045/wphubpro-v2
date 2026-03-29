/**
 * site-heartbeat-check: Scheduled function (every 2 min).
 * Finds sites with stale heartbeats (>5 min). Tries to reconnect via save-connection.
 * If reconnect fails, sets bridge_status to disconnected (inactive).
 */
const sdk = require('node-appwrite');
const fetch = require('node-fetch');

const STALE_MS = 5 * 60 * 1000; // 5 minutes

function ok(res, payload = {}, statusCode = 200) {
  return res.json(payload, statusCode);
}

function fail(res, message, statusCode = 500, extra = {}) {
  return res.json({ success: false, message, ...extra }, statusCode);
}

/** Try to reconnect: create JWT for user, call save-connection via wp-proxy. Returns true if 2xx. */
async function tryReconnect(endpoint, projectId, apiKey, siteId, userId) {
  const users = new sdk.Users(new sdk.Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey));
  let jwt;
  try {
    const jwtResp = await users.createJWT(userId);
    jwt = jwtResp?.jwt || jwtResp?.token;
  } catch (e) {
    return false;
  }
  if (!jwt) return false;

  const url = `${endpoint.replace(/\/$/, '')}/functions/wp-proxy/executions`;
  const body = JSON.stringify({
    siteId,
    endpoint: 'wphubpro/v1/save-connection',
    method: 'POST',
    body: {
      jwt,
      endpoint,
      project_id: projectId,
      site_id: siteId,
    },
  });
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Appwrite-Project': projectId,
        'X-Appwrite-Key': apiKey,
      },
      body,
      timeout: 15000,
    });
    return res.status >= 200 && res.status < 400;
  } catch (e) {
    return false;
  }
}

module.exports = async ({ req, res, log, error }) => {
  const endpoint = process.env.APPWRITE_ENDPOINT || process.env.APPWRITE_FUNCTION_ENDPOINT;
  const projectId = process.env.APPWRITE_PROJECT_ID || process.env.APPWRITE_FUNCTION_PROJECT_ID;
  const apiKey = process.env.APPWRITE_API_KEY || process.env.APPWRITE_FUNCTION_API_KEY || process.env.APPWRITE_KEY;

  if (!endpoint || !projectId || !apiKey) {
    error(`[site-heartbeat-check] Missing env.`);
    return fail(res, 'Function environment is not configured.', 500);
  }

  try {
    const client = new sdk.Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
    const databases = new sdk.Databases(client);

    const sites = await databases.listDocuments('platform_db', 'sites', [sdk.Query.limit(500)]);
    const now = Date.now();
    let updated = 0;

    for (const site of sites.documents) {
      const bridgeStatus = site.bridge_status || 'disconnected';
      const heartbeatAt = site.heartbeat_updated_at;
      if (bridgeStatus !== 'connected' || !heartbeatAt) continue;

      const heartbeatAtMs = new Date(heartbeatAt).getTime();
      if (isNaN(heartbeatAtMs)) continue;

      const ageMs = now - heartbeatAtMs;
      if (ageMs <= STALE_MS) continue;

      // Heartbeat stale > 5 min: try to reconnect, else set inactive
      const userId = site.user_id || site.userId;
      if (!userId) {
        await databases.updateDocument('platform_db', 'sites', site.$id, {
          bridge_status: 'disconnected',
          last_checked: new Date().toISOString(),
        });
        updated++;
        log(`[site-heartbeat-check] Site ${site.$id} stale (${Math.round(ageMs / 60000)} min), no user_id, set inactive`);
        continue;
      }

      const reconnected = await tryReconnect(endpoint, projectId, apiKey, site.$id, userId);
      if (reconnected) {
        const nowIso = new Date().toISOString();
        await databases.updateDocument('platform_db', 'sites', site.$id, {
          bridge_status: 'connected',
          heartbeat_updated_at: nowIso,
          last_checked: nowIso,
        });
        log(`[site-heartbeat-check] Site ${site.$id} stale (${Math.round(ageMs / 60000)} min), reconnected at ${nowIso}`);
      } else {
        await databases.updateDocument('platform_db', 'sites', site.$id, {
          bridge_status: 'disconnected',
          last_checked: new Date().toISOString(),
        });
        log(`[site-heartbeat-check] Site ${site.$id} stale (${Math.round(ageMs / 60000)} min), reconnect failed, set inactive`);
      }
      updated++;
    }

    log(`[site-heartbeat-check] Processed ${updated} sites with stale heartbeats`);
    return ok(res, { success: true, updated });
  } catch (e) {
    error(`[site-heartbeat-check] Error: ${e.message}`);
    return fail(res, e.message, 500);
  }
};
