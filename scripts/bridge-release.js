#!/usr/bin/env node
/**
 * Zip the bridge plugin (version from wphubpro-bridge.php), upload to Appwrite bucket "bridge".
 * Run from wphubpro repo root: node scripts/bridge-release.js
 * Requires: .env with APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY (or APPWRITE_FUNCTION_API_KEY).
 * Bridge is a separate repo: set BRIDGE_DIR in .env (e.g. ../wphubpro-bridge) or it defaults to ../wphubpro-bridge.
 */
import { readFileSync, mkdtempSync, rmSync, existsSync } from 'fs';
import { join, dirname, resolve, basename } from 'path';
import { execSync } from 'child_process';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');

function getBridgeDir(env) {
  const fromEnv = env.BRIDGE_DIR;
  if (fromEnv) {
    const p = resolve(REPO_ROOT, fromEnv);
    if (existsSync(p)) return p;
    console.error('BRIDGE_DIR not found:', p);
    process.exit(1);
  }
  const sibling = join(REPO_ROOT, '..', 'wphubpro-bridge');
  if (existsSync(sibling)) return sibling;
  console.error('Bridge dir not found. Set BRIDGE_DIR in .env (e.g. ../wphubpro-bridge) or clone wphubpro-bridge as sibling of wphubpro.');
  process.exit(1);
}

const BUCKET_ID = 'bridge';

function loadEnv() {
  const envPath = join(REPO_ROOT, '.env');
  try {
    const content = readFileSync(envPath, 'utf8');
    const env = {};
    for (const line of content.split('\n')) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
    }
    return env;
  } catch (e) {
    console.error('Failed to load .env:', e.message);
    process.exit(1);
  }
}

function readBridgeVersion(BRIDGE_DIR) {
  const mainFile = join(BRIDGE_DIR, 'wphubpro-bridge.php');
  const content = readFileSync(mainFile, 'utf8');
  const versionMatch = content.match(/^\s*\*\s*Version:\s*(\d+\.\d+\.\d+)\s*$/m);
  if (!versionMatch) {
    console.error('Could not find Version header in', mainFile);
    process.exit(1);
  }
  const version = versionMatch[1];
  console.log(`Using bridge version ${version} (from plugin header)`);
  return version;
}

function createZip(version, BRIDGE_DIR) {
  const zipName = `wphubpro-bridge-${version}.zip`;
  const tmpDir = mkdtempSync(join(tmpdir(), 'bridge-release-'));
  const zipPath = join(tmpDir, zipName);
  const bridgeDirName = basename(BRIDGE_DIR);
  const bridgeBase = join(BRIDGE_DIR, '..');
  execSync(
    `cd "${bridgeBase}" && zip -r "${zipPath}" ${bridgeDirName} -x "${bridgeDirName}/.git" "${bridgeDirName}/.git/*" "${bridgeDirName}/.cursor" "${bridgeDirName}/.cursor/*" "${bridgeDirName}/.gitignore" "${bridgeDirName}/node_modules/*" "${bridgeDirName}/.DS_Store"`,
    { stdio: 'inherit' }
  );
  return { zipPath, zipName };
}

async function uploadToAppwrite(zipPath, zipName, env) {
  const endpoint = (env.APPWRITE_ENDPOINT || env.APPWRITE_FUNCTION_ENDPOINT || '').replace(/\/$/, '');
  const projectId = env.APPWRITE_PROJECT_ID || env.APPWRITE_FUNCTION_PROJECT_ID;
  const apiKey = env.APPWRITE_API_KEY || env.APPWRITE_FUNCTION_API_KEY;
  if (!endpoint || !projectId || !apiKey) {
    throw new Error('Missing APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, and APPWRITE_API_KEY (or FUNCTION_ variants) in .env');
  }
  const fileId = randomUUID();
  const url = `${endpoint}/storage/buckets/${BUCKET_ID}/files`;
  const body = new FormData();
  const blob = new Blob([readFileSync(zipPath)]);
  body.append('file', blob, zipName);
  body.append('fileId', fileId);
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'X-Appwrite-Project': projectId,
      'X-Appwrite-Key': apiKey,
    },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Appwrite upload failed ${res.status}: ${text}`);
  }
  console.log(`Uploaded ${zipName} to bucket "${BUCKET_ID}" (fileId: ${fileId})`);
}

async function updatePlatformSettings(version, env) {
  const endpoint = (env.APPWRITE_ENDPOINT || env.APPWRITE_FUNCTION_ENDPOINT || '').replace(/\/$/, '');
  const projectId = env.APPWRITE_PROJECT_ID || env.APPWRITE_FUNCTION_PROJECT_ID;
  const apiKey = env.APPWRITE_API_KEY || env.APPWRITE_FUNCTION_API_KEY;
  if (!endpoint || !projectId || !apiKey) return;

  const now = new Date();
  const uploadedAt = now.getFullYear() + '-' +
    String(now.getMonth() + 1).padStart(2, '0') + '-' +
    String(now.getDate()).padStart(2, '0') + ' ' +
    String(now.getHours()).padStart(2, '0') + ':' +
    String(now.getMinutes()).padStart(2, '0') + ':' +
    String(now.getSeconds()).padStart(2, '0');
  const value = JSON.stringify({
    version: version,
    uploaded_at: uploadedAt,
  });

  const base = `${endpoint}/databases/platform_db/collections/platform_settings`;
  const headers = {
    'X-Appwrite-Project': projectId,
    'X-Appwrite-Key': apiKey,
    'Content-Type': 'application/json',
  };

  const qEqual = JSON.stringify({ method: 'equal', attribute: 'key', values: ['bridge_plugin'] });
  const qLimit = JSON.stringify({ method: 'limit', values: [1] });
  const listRes = await fetch(`${base}/documents?queries[]=${encodeURIComponent(qEqual)}&queries[]=${encodeURIComponent(qLimit)}`, { headers });
  if (!listRes.ok) {
    console.warn('Could not list platform_settings:', listRes.status);
    return;
  }
  const list = await listRes.json();

  if (list.total > 0 && list.documents?.[0]?.$id) {
    const docId = list.documents[0].$id;
    const updateRes = await fetch(`${base}/documents/${docId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ data: { value } }),
    });
    if (updateRes.ok) {
      console.log(`Updated platform_settings bridge_plugin to v${version}`);
    } else {
      console.warn('Could not update platform_settings:', updateRes.status);
    }
  } else {
    const createRes = await fetch(`${base}/documents`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        documentId: randomUUID(),
        data: { key: 'bridge_plugin', value },
      }),
    });
    if (createRes.ok) {
      console.log(`Created platform_settings bridge_plugin v${version}`);
    } else {
      console.warn('Could not create platform_settings:', createRes.status, await createRes.text());
    }
  }
}

async function main() {
  const env = loadEnv();
  const BRIDGE_DIR = getBridgeDir(env);
  const version = readBridgeVersion(BRIDGE_DIR);
  const { zipPath, zipName } = createZip(version, BRIDGE_DIR);
  const tmpDir = join(zipPath, '..');
  try {
    await uploadToAppwrite(zipPath, zipName, env);
    await updatePlatformSettings(version, env);
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
  console.log('Bridge release done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
