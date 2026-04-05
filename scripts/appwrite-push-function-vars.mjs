#!/usr/bin/env node
/**
 * Upserts APPWRITE_FUNCTION_API_KEY and APPWRITE_FUNCTION_ENDPOINT on every function
 * listed in appwrite.config.json, using the Appwrite REST API (no secrets in JSON).
 *
 * Required env (e.g. from .env):
 *   APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY  — management API
 *   APPWRITE_FUNCTION_API_KEY, APPWRITE_FUNCTION_ENDPOINT     — values to set on each function
 *
 * Usage:
 *   node scripts/appwrite-push-function-vars.mjs --env-file=.env
 *   node scripts/appwrite-push-function-vars.mjs --env-file=.env --dry-run
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, '..');
const CONFIG_PATH = path.join(REPO_ROOT, 'appwrite.config.json');

function loadEnvFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

function normalizeBaseEndpoint(raw) {
  const s = String(raw || '').trim().replace(/\/+$/, '');
  if (!s) return '';
  return s.endsWith('/v1') ? s : `${s}/v1`;
}

async function apiJson(method, url, headers, body) {
  const opts = { method, headers: { ...headers } };
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(url, opts);
  const text = await res.text();
  let parsed = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }
  if (!res.ok) {
    const msg =
      typeof parsed === 'object' && parsed && parsed.message ? parsed.message : text || res.statusText;
    throw new Error(`${method} ${url} → ${res.status}: ${msg}`);
  }
  return parsed;
}

function findVarIdByKey(listJson, key) {
  const vars = listJson?.variables ?? listJson?.documents ?? [];
  if (!Array.isArray(vars)) return null;
  const v = vars.find((x) => x && x.key === key);
  return v?.$id ?? v?.id ?? null;
}

async function upsertVariable({ base, projectId, apiKey, functionId, key, value, secret }) {
  const h = {
    'X-Appwrite-Project': projectId,
    'X-Appwrite-Key': apiKey,
    'X-Appwrite-Response-Format': '1.8.0',
  };
  const listUrl = `${base}/functions/${encodeURIComponent(functionId)}/variables`;
  const listJson = await apiJson('GET', listUrl, h);
  const existingId = findVarIdByKey(listJson, key);

  if (existingId) {
    const putUrl = `${base}/functions/${encodeURIComponent(functionId)}/variables/${encodeURIComponent(existingId)}`;
    await apiJson('PUT', putUrl, h, { key, value, secret });
    return 'updated';
  }
  const postUrl = `${base}/functions/${encodeURIComponent(functionId)}/variables`;
  await apiJson('POST', postUrl, h, { key, value, secret });
  return 'created';
}

function parseArgs(argv) {
  let envFile = path.join(REPO_ROOT, '.env');
  let dryRun = false;
  for (const a of argv) {
    if (a === '--dry-run') dryRun = true;
    else if (a.startsWith('--env-file=')) envFile = a.slice('--env-file='.length);
  }
  return { envFile, dryRun };
}

async function main() {
  const { envFile, dryRun } = parseArgs(process.argv.slice(2));
  if (fs.existsSync(envFile)) loadEnvFile(envFile);

  const endpoint = normalizeBaseEndpoint(process.env.APPWRITE_ENDPOINT);
  const projectId = process.env.APPWRITE_PROJECT_ID?.trim();
  const apiKey = process.env.APPWRITE_API_KEY?.trim();
  const fnApiKey = process.env.APPWRITE_FUNCTION_API_KEY?.trim();
  const fnEndpoint = process.env.APPWRITE_FUNCTION_ENDPOINT?.trim();

  if (!endpoint || !projectId || !apiKey) {
    console.error('Missing APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, or APPWRITE_API_KEY.');
    process.exit(1);
  }
  if (!fnApiKey || !fnEndpoint) {
    console.error('Missing APPWRITE_FUNCTION_API_KEY or APPWRITE_FUNCTION_ENDPOINT.');
    process.exit(1);
  }

  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  const ids = (config.functions || []).map((f) => f.$id).filter(Boolean);

  const targets = [
    { key: 'APPWRITE_FUNCTION_API_KEY', value: fnApiKey, secret: true },
    { key: 'APPWRITE_FUNCTION_ENDPOINT', value: fnEndpoint, secret: false },
  ];

  console.log(`Functions: ${ids.length} | dry-run: ${dryRun}`);

  for (const functionId of ids) {
    for (const t of targets) {
      if (dryRun) {
        console.log(`[dry-run] ${functionId} ${t.key}`);
        continue;
      }
      try {
        const action = await upsertVariable({
          base: endpoint,
          projectId,
          apiKey,
          functionId,
          key: t.key,
          value: t.value,
          secret: t.secret,
        });
        console.log(`${functionId} ${t.key}: ${action}`);
      } catch (e) {
        console.error(`${functionId} ${t.key}: FAILED`, e.message || e);
        process.exitCode = 1;
      }
    }
  }

  if (!dryRun && process.exitCode !== 1) {
    console.log('\nDone. Redeploy if needed: appwrite push functions');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
