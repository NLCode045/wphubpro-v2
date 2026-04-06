/**
 * Returns a public download URL for the latest WPHubPro Bridge zip.
 * Bucket has read("any") – URL without token works for direct download.
 */
/* eslint-disable no-unused-vars */
const sdk = require('node-appwrite');

const BRIDGE_BUCKET_ID = 'bridge';

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

    const storage = new sdk.Storage(client);

    const list = await storage.listFiles(BRIDGE_BUCKET_ID, []);
    const withVersions = (list.files || [])
      .map((f) => ({
        $id: f.$id,
        name: f.name,
        version: parseVersionFromName(f.name),
      }))
      .filter((f) => f.version != null);

    if (withVersions.length === 0) {
      return fail(res, 'No bridge zip files found in bucket.', 404);
    }

    withVersions.sort((a, b) => compareVersions(b.version, a.version));
    const latest = withVersions[0];

    log(`[bridge-download-url] Latest: ${latest.name} (${latest.version})`);

    const baseUrl = endpoint.replace(/\/$/, '');
    const downloadUrl = `${baseUrl}/storage/buckets/${BRIDGE_BUCKET_ID}/files/${latest.$id}/download?project=${projectId}`;

    return ok(res, {
      success: true,
      version: latest.version,
      fileId: latest.$id,
      fileName: latest.name,
      downloadUrl,
    });
  } catch (e) {
    error(`[bridge-download-url] Error: ${e.message}`);
    return fail(res, e.message || 'Failed to get bridge download URL.', 500);
  }
};
