/**
 * Returns the latest bridge plugin version from platform_settings (key: bridge_plugin).
 * Falls back to storage bucket listing if not in platform_settings.
 */
/* eslint-disable no-unused-vars */
const sdk = require('node-appwrite');

const BRIDGE_BUCKET_ID = 'bridge';
const PLATFORM_SETTINGS_KEY = 'bridge_plugin';

function parseVersionFromName(name) {
  const m = String(name || '').match(/wphubpro-bridge-(\d+\.\d+\.\d+)\.zip$/i);
  return m ? m[1] : null;
}

function compareVersions(a, b) {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0);
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const va = pa[i] ?? 0;
    const vb = pb[i] ?? 0;
    if (va > vb) return 1;
    if (va < vb) return -1;
  }
  return 0;
}

function ok(res, payload = {}, statusCode = 200) {
  return res.json(payload, statusCode);
}

function fail(res, message, statusCode = 500) {
  return res.json({ success: false, message }, statusCode);
}

module.exports = async ({ req, res, log, error }) => {
  const endpoint = process.env.APPWRITE_ENDPOINT || process.env.APPWRITE_FUNCTION_ENDPOINT;
  const projectId = process.env.APPWRITE_PROJECT_ID || process.env.APPWRITE_FUNCTION_PROJECT_ID;
  const apiKey = process.env.APPWRITE_API_KEY || process.env.APPWRITE_FUNCTION_API_KEY || process.env.APPWRITE_KEY;

  if (!endpoint || !projectId || !apiKey) {
    return fail(res, 'Function environment is not configured.', 500);
  }

  try {
    const client = new sdk.Client()
      .setEndpoint(endpoint)
      .setProject(projectId)
      .setKey(apiKey);

    const databases = new sdk.Databases(client);

    // 1. Try platform_settings first
    const list = await databases.listDocuments('platform_db', 'platform_settings', [
      sdk.Query.equal('key', PLATFORM_SETTINGS_KEY),
      sdk.Query.limit(1),
    ]);

    if (list.total > 0 && list.documents[0]?.value) {
      try {
        const data = JSON.parse(list.documents[0].value);
        if (data.version) {
          log(`[bridge-latest-version] From platform_settings: ${data.version}`);
          return ok(res, {
            success: true,
            version: data.version,
            uploaded_at: data.uploaded_at || null,
          });
        }
      } catch (e) {
        log(`[bridge-latest-version] Invalid platform_settings value, falling back to storage`);
      }
    }

    // 2. Fallback: list storage bucket
    const storage = new sdk.Storage(client);
    const files = await storage.listFiles(BRIDGE_BUCKET_ID, []);
    const withVersions = (files.files || [])
      .map((f) => ({ version: parseVersionFromName(f.name) }))
      .filter((f) => f.version != null);

    if (withVersions.length === 0) {
      return fail(res, 'No bridge version found.', 404);
    }

    withVersions.sort((a, b) => compareVersions(b.version, a.version));
    const latest = withVersions[0];
    log(`[bridge-latest-version] From storage: ${latest.version}`);

    return ok(res, {
      success: true,
      version: latest.version,
      uploaded_at: null,
    });
  } catch (e) {
    error(`[bridge-latest-version] Error: ${e.message}`);
    return fail(res, e.message || 'Failed to get bridge version.', 500);
  }
};
