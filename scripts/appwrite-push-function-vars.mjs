#!/usr/bin/env node
/**
 * Upserts environment variables on every function in appwrite.config.json from your .env files.
 * Uses the Appwrite CLI (`appwrite functions list-variables` / `create-variable` / `update-variable`).
 *
 * Loads (in order, later overrides):
 *   --env-file=<path>     default: <repo>/.env
 *   <same-dir>/.env.local if it exists (unless --no-env-local)
 *
 * Always sets canonical names functions expect, e.g. STRIPE_SECRET_KEY from STRIPE_SECRET_KEY or _STRIPE_SECRET_KEY.
 * With --sync-all-keys, also pushes every other key from the merged env (skips Vercel/blob/OIDC noise).
 *
 * Prerequisites:
 *   - Appwrite CLI installed (commands use kebab-case: create-variable, --function-id, etc.).
 *   - Run from the repo root (or cwd where appwrite.config.json lives); the CLI reads project + endpoint from it.
 *   - Auth: `appwrite login` or `appwrite client --key <API_KEY>` (needs functions.read + functions.write).
 *     Optional key in .env for your own reference: APPWRITE_MANAGEMENT_API_KEY or APPWRITE_API_KEY — the CLI does not
 *     read these automatically; sync them with `appwrite client --key` when using API key auth.
 *
 * Optional:
 *   --appwrite-cli=<path>   path to the appwrite binary (default: `appwrite` on PATH)
 *   --management-endpoint=  documented for parity with older runs; the CLI uses appwrite.config.json endpoint.
 *     If your endpoint is wrong, fix appwrite.config.json or run `appwrite client --endpoint <url>`.
 *
 * Typical run:
 *   npm run appwrite:push-fn-vars
 *   node scripts/appwrite-push-function-vars.mjs --env-file=.env --dry-run
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, '..');
const CONFIG_PATH = path.join(REPO_ROOT, 'appwrite.config.json');

/** Never push these to Appwrite functions (wrong runtime / too sensitive / ephemeral). */
const SKIP_KEYS = new Set(
  [
    'VERCEL_OIDC_TOKEN',
    'BLOB_READ_WRITE_TOKEN',
    'NODE_ENV',
    'CI',
    'PATH',
    'HOME',
    'PWD',
  ].map((k) => k.toUpperCase()),
);

function shouldSkipKey(key) {
  const k = String(key || '').trim();
  if (!k) return true;
  const u = k.toUpperCase();
  if (SKIP_KEYS.has(u)) return true;
  if (u.startsWith('VERCEL_')) return true;
  if (u.startsWith('BLOB_')) return true;
  return false;
}

function isSecretEnvKey(key) {
  const u = String(key).toUpperCase();
  if (u.includes('PUBLISHABLE')) return false;
  if (['GEMINI_MODEL', 'S3_REGION', 'S3_BUCKET', 'APPWRITE_ENDPOINT', 'APPWRITE_FUNCTION_ENDPOINT'].includes(u))
    return false;
  if (
    /SECRET|PASSWORD|PRIVATE|TOKEN|WEBHOOK|ENCRYPTION|_KEY$|API_KEY|ACCESS_KEY|GEMINI_API|GOOGLE_API/.test(u)
  ) {
    return true;
  }
  return false;
}

function parseEnvFile(filePath) {
  const out = {};
  if (!fs.existsSync(filePath)) return out;
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
    out[key] = val;
  }
  return out;
}

function mergeEnvFiles(primaryPath, localPath, useLocal) {
  const base = parseEnvFile(primaryPath);
  if (!useLocal || !localPath) return base;
  return { ...base, ...parseEnvFile(localPath) };
}

function runAppwrite(appwriteBin, argv, { cwd }) {
  return new Promise((resolve, reject) => {
    const child = spawn(appwriteBin, argv, {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: process.env,
    });
    let out = '';
    let err = '';
    child.stdout.on('data', (d) => {
      out += d;
    });
    child.stderr.on('data', (d) => {
      err += d;
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) {
        const msg = [err.trim(), out.trim()].filter(Boolean).join('\n') || `exit ${code}`;
        reject(new Error(msg));
      } else {
        resolve(out);
      }
    });
  });
}

async function fetchVariableKeyToId(appwriteBin, functionId) {
  const raw = await runAppwrite(
    appwriteBin,
    ['--json', 'functions', 'list-variables', `--function-id=${functionId}`],
    { cwd: REPO_ROOT },
  );
  const parsed = JSON.parse(raw.trim());
  const vars = parsed?.variables ?? parsed?.documents ?? [];
  const map = new Map();
  if (Array.isArray(vars)) {
    for (const v of vars) {
      if (v?.key && (v.$id || v.id)) {
        map.set(v.key, v.$id ?? v.id);
      }
    }
  }
  return map;
}

async function upsertVariableCli(appwriteBin, functionId, { key, value, secret }, keyToId) {
  const existingId = keyToId.get(key);
  const baseArgs = ['--json', 'functions'];
  const secretArgs = secret ? ['--secret'] : [];

  if (existingId) {
    await runAppwrite(
      appwriteBin,
      [
        ...baseArgs,
        'update-variable',
        `--function-id=${functionId}`,
        `--variable-id=${existingId}`,
        `--key=${key}`,
        `--value=${value}`,
        ...secretArgs,
      ],
      { cwd: REPO_ROOT },
    );
    return 'updated';
  }

  await runAppwrite(
    appwriteBin,
    [
      ...baseArgs,
      'create-variable',
      `--function-id=${functionId}`,
      `--key=${key}`,
      `--value=${value}`,
      ...secretArgs,
    ],
    { cwd: REPO_ROOT },
  );
  return 'created';
}

function getTrimmed(map, key) {
  const v = map[key];
  return v != null && String(v).trim() !== '' ? String(v).trim() : '';
}

/**
 * Build variable rows for all functions from merged .env map.
 */
function buildVariableTargets(map, { syncAllKeys }) {
  const g = (k) => getTrimmed(map, k);

  const stripeSecret = g('STRIPE_SECRET_KEY') || g('_STRIPE_SECRET_KEY');
  const stripePublishable = g('STRIPE_PUBLISHABLE_KEY') || g('_STRIPE_PUBLISHABLE_KEY');
  const stripeWebhook = g('STRIPE_WEBHOOK_SECRET') || g('_STRIPE_WEBHOOK_SECRET');

  const fnEndpoint = g('APPWRITE_FUNCTION_ENDPOINT');
  const dbId = g('APPWRITE_DATABASE_ID');
  const accId = g('APPWRITE_ACCOUNTS_COLLECTION_ID');

  const curated = [];

  function add(key, value, secretOverride) {
    if (value == null || String(value).trim() === '') return;
    if (shouldSkipKey(key)) return;
    const secret = secretOverride !== undefined ? secretOverride : isSecretEnvKey(key);
    curated.push({ key, value: String(value).trim(), secret });
  }

  add('APPWRITE_ENDPOINT', g('APPWRITE_ENDPOINT'), false);
  add('APPWRITE_PROJECT_ID', g('APPWRITE_PROJECT_ID'), false);
  add('APPWRITE_API_KEY', g('APPWRITE_API_KEY'), true);
  add('APPWRITE_DATABASE_ID', dbId, false);
  add('APPWRITE_ACCOUNTS_COLLECTION_ID', accId, false);
  add('APPWRITE_SITES_COLLECTION_ID', g('APPWRITE_SITES_COLLECTION_ID'), false);
  add('APPWRITE_LIBRARY_COLLECTION_ID', g('APPWRITE_LIBRARY_COLLECTION_ID'), false);
  add('APPWRITE_ADMIN_TEAM_ID', g('APPWRITE_ADMIN_TEAM_ID'), false);
  add('APPWRITE_HEARTBEAT_URL', g('APPWRITE_HEARTBEAT_URL'), false);
  add('APPWRITE_FUNCTION_API_KEY', g('APPWRITE_FUNCTION_API_KEY'), true);
  add('APPWRITE_FUNCTION_ENDPOINT', fnEndpoint, false);
  if (fnEndpoint) add('APPWRITE_FUNCTION_API_ENDPOINT', fnEndpoint, false);

  add('ENCRYPTION_KEY', g('ENCRYPTION_KEY'), true);
  add('STRIPE_SECRET_KEY', stripeSecret, true);
  add('STRIPE_PUBLISHABLE_KEY', stripePublishable, false);
  add('STRIPE_WEBHOOK_SECRET', stripeWebhook, true);

  add('S3_BUCKET', g('S3_BUCKET'), false);
  add('S3_REGION', g('S3_REGION'), false);
  add('S3_ACCESS_KEY_ID', g('S3_ACCESS_KEY_ID'), true);
  add('S3_SECRET_ACCESS_KEY', g('S3_SECRET_ACCESS_KEY'), true);

  add('GOOGLE_API_KEY', g('GOOGLE_API_KEY'), true);
  add('GEMINI_API_KEY', g('GEMINI_API_KEY'), true);
  add('GEMINI_MODEL', g('GEMINI_MODEL'), false);

  if (dbId) add('DATABASE_ID', dbId, false);
  if (accId) add('ACCOUNTS_COLLECTION_ID', accId, false);
  if (dbId) add('PLATFORM_DATABASE_ID', dbId, false);

  const seen = new Set(curated.map((c) => c.key));

  if (syncAllKeys) {
    for (const [k, v] of Object.entries(map)) {
      if (shouldSkipKey(k)) continue;
      if (seen.has(k)) continue;
      if (k.startsWith('_STRIPE_')) continue;
      if (!String(v).trim()) continue;
      add(k, v, undefined);
      seen.add(k);
    }
  }

  const byKey = new Map();
  for (const t of curated) {
    if (!shouldSkipKey(t.key) && t.value) byKey.set(t.key, t);
  }
  return [...byKey.values()];
}

function parseArgs(argv) {
  let envFile = path.join(REPO_ROOT, '.env');
  let useEnvLocal = true;
  let dryRun = false;
  let syncAllKeys = true;
  let managementEndpointCli = '';
  let appwriteCli = process.env.APPWRITE_CLI_PATH?.trim() || 'appwrite';
  for (const a of argv) {
    if (a === '--dry-run') dryRun = true;
    else if (a === '--no-env-local') useEnvLocal = false;
    else if (a === '--no-sync-all-keys') syncAllKeys = false;
    else if (a.startsWith('--env-file=')) envFile = a.slice('--env-file='.length);
    else if (a.startsWith('--management-endpoint=')) managementEndpointCli = a.slice('--management-endpoint='.length);
    else if (a.startsWith('--appwrite-cli=')) appwriteCli = a.slice('--appwrite-cli='.length);
  }
  const envDir = path.dirname(path.isAbsolute(envFile) ? envFile : path.join(REPO_ROOT, envFile));
  const envLocal = path.join(envDir, '.env.local');
  return {
    envFile: path.isAbsolute(envFile) ? envFile : path.join(REPO_ROOT, envFile),
    envLocal,
    useEnvLocal,
    dryRun,
    syncAllKeys,
    managementEndpointCli,
    appwriteCli,
  };
}

async function main() {
  const { envFile, envLocal, useEnvLocal, dryRun, syncAllKeys, managementEndpointCli, appwriteCli } = parseArgs(
    process.argv.slice(2),
  );

  const merged = mergeEnvFiles(envFile, envLocal, useEnvLocal);
  for (const [k, v] of Object.entries(merged)) {
    if (process.env[k] === undefined) process.env[k] = v;
  }

  if (managementEndpointCli) {
    console.warn(
      'Note: --management-endpoint is ignored when using the Appwrite CLI; endpoint comes from appwrite.config.json / `appwrite client --endpoint`.',
    );
  }

  const targets = buildVariableTargets(merged, { syncAllKeys });
  if (targets.length === 0) {
    console.error('No variables to push. Check your .env / .env.local.');
    process.exit(1);
  }

  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  const ids = (config.functions || []).map((f) => f.$id).filter(Boolean);
  const configProjectId = String(config.projectId || '').trim();

  const envProjectId = String(merged.APPWRITE_PROJECT_ID || '').trim();
  if (configProjectId && envProjectId && configProjectId !== envProjectId) {
    console.warn(
      `Warning: appwrite.config.json projectId (${configProjectId}) differs from APPWRITE_PROJECT_ID in env (${envProjectId}). The CLI uses the linked project in appwrite.config.json.`,
    );
  }

  console.log(
    `CLI: ${appwriteCli}\nProject (config): ${configProjectId || '(see appwrite.config.json)'}\nFunctions: ${ids.length} | variables each: ${targets.length} | .env: ${envFile}${useEnvLocal && fs.existsSync(envLocal) ? ` + ${path.basename(envLocal)}` : ''} | sync-all: ${syncAllKeys} | dry-run: ${dryRun}`,
  );

  let failures = 0;
  let printedAuthHint = false;
  for (const functionId of ids) {
    let keyToId = new Map();
    let fnFails = 0;
    if (!dryRun) {
      try {
        keyToId = await fetchVariableKeyToId(appwriteCli, functionId);
      } catch (e) {
        const msg = e.message || String(e);
        console.error(`${functionId}: list-variables FAILED`, msg);
        if (!printedAuthHint && /session|not found|401|unauthor/i.test(msg)) {
          printedAuthHint = true;
          console.error(`
CLI auth — usual causes:
  1) No API key / session: run \`appwrite login\` or \`appwrite client --key <API_KEY>\` (scopes: functions.read + functions.write).
  2) Project not linked: run \`appwrite init project\` or ensure appwrite.config.json matches your Appwrite project.
  See https://appwrite.io/docs/tooling/command-line/installation
`);
        }
        failures += targets.length;
        continue;
      }
    }

    for (const t of targets) {
      if (dryRun) {
        console.log(`[dry-run] ${functionId} ${t.key}${t.secret ? ' (secret)' : ''}`);
        continue;
      }
      try {
        await upsertVariableCli(appwriteCli, functionId, t, keyToId);
      } catch (e) {
        const msg = e.message || String(e);
        console.error(`${functionId} ${t.key}: FAILED`, msg);
        if (!printedAuthHint && /session|not found|401|unauthor/i.test(msg)) {
          printedAuthHint = true;
          console.error(`
CLI auth — usual causes:
  1) No API key / session: run \`appwrite login\` or \`appwrite client --key <API_KEY>\` (scopes: functions.read + functions.write).
  2) Project not linked: run \`appwrite init project\` or ensure appwrite.config.json matches your Appwrite project.
  See https://appwrite.io/docs/tooling/command-line/installation
`);
        }
        failures += 1;
        fnFails += 1;
      }
    }
    if (!dryRun && fnFails === 0) console.log(`… ${functionId} (${targets.length} vars)`);
  }

  if (failures > 0) {
    process.exitCode = 1;
    console.error(`\nCompleted with ${failures} failed operations.`);
  } else if (!dryRun) {
    console.log('\nDone. Functions read vars at cold start — existing deployments pick them up; if in doubt, redeploy: appwrite push functions');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
