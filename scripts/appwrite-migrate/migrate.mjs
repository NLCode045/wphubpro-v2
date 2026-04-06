#!/usr/bin/env node
/**
 * Cross-project Appwrite migration (Scenario B).
 * Credentials only via environment variables or --env-file (never commit secrets).
 *
 * @see INSTANCE_BACKUP.md for full-instance backup/restore (Scenario A).
 */

import fs from 'node:fs';
import crypto from 'node:crypto';
import {
  Client,
  Databases,
  TablesDB,
  Storage,
  Teams,
  Users,
  Functions,
  Query,
  AppwriteException,
} from 'node-appwrite';
import { InputFile } from 'node-appwrite/file';

const ACK_ENV = 'APPWRITE_MIGRATE_USERS_I_KNOW_PASSWORDS_DONT_COPY';

function printHelp() {
  console.log(`
Appwrite project migration (source → destination)

Environment (required):
  SOURCE_APPWRITE_ENDPOINT       e.g. https://old.example.com/v1
  SOURCE_APPWRITE_PROJECT_ID
  SOURCE_APPWRITE_API_KEY
  DEST_APPWRITE_ENDPOINT
  DEST_APPWRITE_PROJECT_ID
  DEST_APPWRITE_API_KEY

Optional:
  --env-file=PATH                Load KEY=value lines into process.env
  --dry-run                      Log actions only
  --skip-existing                Treat 409 as skip (users, teams, docs, files, buckets)
  --only=PHASES                  Comma-separated: schema,users,teams,documents,storage,functions-vars
                                 Default: all except users (users are opt-in)
  --migrate-users              Copy users (see warnings below)
  --user-hashes=PATH           JSON array: { userId, email, name?, hashType, password }
                                 hashType: bcrypt | argon2 | md5 (Appwrite-supported hashed endpoints)
  --documents-api=MODE         auto | legacy | tables  (default: auto)
  --databases=IDS              Comma-separated database $ids (default: all on source)

User migration warnings:
  Without --user-hashes, new users get a random internal password; they must use password recovery.
  Appwrite does not expose password hashes over the API — hashes JSON must come from your own export.
  Set ${ACK_ENV}=1 together with --migrate-users to confirm.

Schema & function code:
  This script does not push collection schemas or deploy function source. Use Appwrite CLI from this repo:
    appwrite push
    appwrite deploy function --all
  Run --only=schema to print these reminders.

Functions:
  --only=functions-vars copies environment variables from source functions to destination (same function $id must exist).

Example:
  npm run migrate:appwrite -- --env-file=.env.migration --skip-existing
`);
}

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
    if (key) process.env[key] = val;
  }
}

function parseArgs(argv) {
  const flags = {
    dryRun: false,
    skipExisting: false,
    migrateUsers: false,
    userHashesPath: null,
    envFile: null,
    only: null,
    documentsApi: 'auto',
    databases: null,
    help: false,
  };
  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') flags.help = true;
    else if (arg === '--dry-run') flags.dryRun = true;
    else if (arg === '--skip-existing') flags.skipExisting = true;
    else if (arg === '--migrate-users') flags.migrateUsers = true;
    else if (arg.startsWith('--env-file=')) flags.envFile = arg.slice('--env-file='.length);
    else if (arg.startsWith('--only=')) flags.only = arg.slice('--only='.length).split(',').map((s) => s.trim()).filter(Boolean);
    else if (arg.startsWith('--user-hashes=')) flags.userHashesPath = arg.slice('--user-hashes='.length);
    else if (arg.startsWith('--documents-api=')) flags.documentsApi = arg.slice('--documents-api='.length);
    else if (arg.startsWith('--databases='))
      flags.databases = arg
        .slice('--databases='.length)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
  }
  return flags;
}

function requireEnv(name) {
  const v = process.env[name];
  if (!v || !String(v).trim()) throw new Error(`Missing or empty environment variable: ${name}`);
  return String(v).trim();
}

function normalizeEndpoint(url) {
  return url.replace(/\/+$/, '');
}

function isConflict(e) {
  return e instanceof AppwriteException && e.code === 409;
}

function isNotFound(e) {
  return e instanceof AppwriteException && e.code === 404;
}

function randomPassword() {
  return crypto.randomBytes(24).toString('base64url') + 'Aa1!'; // satisfies typical length & complexity
}

function stripMeta(obj) {
  const out = {};
  if (!obj || typeof obj !== 'object') return out;
  for (const [k, v] of Object.entries(obj)) {
    if (k.startsWith('$')) continue;
    out[k] = v;
  }
  return out;
}

async function paginateCursor(fetchPage) {
  const out = [];
  let lastId = null;
  for (;;) {
    const queries = [Query.limit(100)];
    if (lastId) queries.push(Query.cursorAfter(lastId));
    const items = await fetchPage(queries);
    if (!items.length) break;
    out.push(...items);
    lastId = items[items.length - 1].$id;
    if (items.length < 100) break;
  }
  return out;
}

function makeClient(endpoint, projectId, apiKey) {
  return new Client()
    .setEndpoint(normalizeEndpoint(endpoint))
    .setProject(projectId)
    .setKey(apiKey);
}

function shouldRun(phase, onlyList) {
  return onlyList.includes(phase);
}

async function phaseSchema() {
  console.log(`
[schema] Push database / collection definitions and project settings from this repo:
  - Ensure Appwrite CLI is installed and logged in to the destination project.
  - From the repo root:  appwrite push
  - Deploy function code: appwrite deploy function --all
Re-copy console-only settings (OAuth, webhooks, platforms) manually if needed.
`);
}

async function ensureDatabases({ srcDb, destDb, dryRun, skipExisting, databaseFilter }) {
  const dbs = await paginateCursor(async (queries) => {
    const r = await srcDb.list({ queries });
    return r.databases || [];
  });
  const filtered = databaseFilter ? dbs.filter((d) => databaseFilter.has(d.$id)) : dbs;
  for (const db of filtered) {
    try {
      await destDb.get({ databaseId: db.$id });
      console.log(`[documents] database exists on dest: ${db.$id}`);
    } catch (e) {
      if (!isNotFound(e)) throw e;
      console.log(`[documents] create database on dest: ${db.$id} (${db.name})`);
      if (!dryRun) {
        try {
          await destDb.create({ databaseId: db.$id, name: db.name, enabled: db.enabled !== false });
        } catch (err) {
          if (skipExisting && isConflict(err)) console.warn(`[documents] skip database (conflict): ${db.$id}`);
          else throw err;
        }
      }
    }
  }
  return filtered;
}

async function listLegacyCollections(db, databaseId) {
  return paginateCursor(async (queries) => {
    const r = await db.listCollections({ databaseId, queries });
    return r.collections || [];
  });
}

async function listTables(tdb, databaseId) {
  return paginateCursor(async (queries) => {
    const r = await tdb.listTables({ databaseId, queries });
    return r.tables || [];
  });
}

async function resolveDocumentTargets({ srcDb, srcTables, databaseId, documentsApi }) {
  if (documentsApi === 'legacy') {
    const tables = await listLegacyCollections(srcDb, databaseId);
    return { kind: 'legacy', tables };
  }
  if (documentsApi === 'tables') {
    const tables = await listTables(srcTables, databaseId);
    return { kind: 'tables', tables };
  }
  let legacy = [];
  try {
    legacy = await listLegacyCollections(srcDb, databaseId);
  } catch {
    legacy = [];
  }
  if (legacy.length > 0) return { kind: 'legacy', tables: legacy };
  const tbl = await listTables(srcTables, databaseId);
  return { kind: 'tables', tables: tbl };
}

async function migrateDocumentsForTable({
  kind,
  databaseId,
  tableId,
  srcDb,
  destDb,
  srcTables,
  destTables,
  dryRun,
  skipExisting,
}) {
  const listRows = async (queries) => {
    if (kind === 'legacy') {
      const r = await srcDb.listDocuments({ databaseId, collectionId: tableId, queries });
      return r.documents || [];
    }
    const r = await srcTables.listRows({ databaseId, tableId, queries });
    return r.rows || [];
  };

  const rows = await paginateCursor(listRows);
  let n = 0;
  for (const doc of rows) {
    const data = stripMeta(doc);
    const perms = doc.$permissions?.length ? doc.$permissions : undefined;
    if (dryRun) {
      n++;
      continue;
    }
    try {
      if (kind === 'legacy') {
        await destDb.createDocument({
          databaseId,
          collectionId: tableId,
          documentId: doc.$id,
          data,
          permissions: perms,
        });
      } else {
        await destTables.createRow({
          databaseId,
          tableId,
          rowId: doc.$id,
          data,
          permissions: perms,
        });
      }
      n++;
    } catch (e) {
      if (skipExisting && isConflict(e)) {
        console.warn(`[documents] skip row ${databaseId}/${tableId}/${doc.$id} (exists)`);
      } else throw e;
    }
  }
  console.log(`[documents] ${databaseId}/${tableId}: migrated ${n} rows (${kind})`);
}

async function phaseDocuments(ctx) {
  const { srcDb, destDb, srcTables, destTables, flags } = ctx;
  const databaseFilter = flags.databases ? new Set(flags.databases) : null;

  const dbs = await ensureDatabases({
    srcDb,
    destDb,
    dryRun: flags.dryRun,
    skipExisting: flags.skipExisting,
    databaseFilter,
  });

  for (const db of dbs) {
    const { kind, tables } = await resolveDocumentTargets({
      srcDb,
      srcTables,
      databaseId: db.$id,
      documentsApi: flags.documentsApi,
    });
    if (tables.length === 0) {
      console.log(`[documents] no collections/tables in ${db.$id}`);
      continue;
    }
    for (const t of tables) {
      await migrateDocumentsForTable({
        kind,
        databaseId: db.$id,
        tableId: t.$id,
        srcDb,
        destDb,
        srcTables,
        destTables,
        dryRun: flags.dryRun,
        skipExisting: flags.skipExisting,
      });
    }
  }
}

async function phaseUsers(ctx) {
  const { srcUsers, destUsers, flags } = ctx;
  let hashRows = [];
  if (flags.userHashesPath) {
    const raw = fs.readFileSync(flags.userHashesPath, 'utf8');
    hashRows = JSON.parse(raw);
    if (!Array.isArray(hashRows)) throw new Error('--user-hashes JSON must be an array');
  }

  if (!flags.migrateUsers) {
    console.log('[users] skipped (use --migrate-users; see --help)');
    return;
  }
  if (process.env[ACK_ENV] !== '1') {
    throw new Error(`Refusing user migration: set ${ACK_ENV}=1 after reading --help warnings.`);
  }

  const allUsers = await paginateCursor(async (queries) => {
    const r = await srcUsers.list({ queries });
    return r.users || [];
  });

  for (const u of allUsers) {
    const hash = hashRows.find((h) => h.userId === u.$id);
    if (flags.dryRun) {
      console.log(`[users] would migrate ${u.$id} ${u.email || u.phone || ''}`);
      continue;
    }
    try {
      if (hash) {
        const email = hash.email || u.email;
        if (!email) throw new Error(`user ${u.$id}: hash entry needs email`);
        const pwd = hash.password;
        if (!pwd) throw new Error(`user ${u.$id}: hash entry needs password (hash string)`);
        const name = hash.name ?? u.name;
        const ht = String(hash.hashType || 'bcrypt').toLowerCase();
        if (ht === 'bcrypt') {
          await destUsers.createBcryptUser({ userId: u.$id, email, password: pwd, name });
        } else if (ht === 'argon2') {
          await destUsers.createArgon2User({ userId: u.$id, email, password: pwd, name });
        } else if (ht === 'md5') {
          await destUsers.createMD5User({ userId: u.$id, email, password: pwd, name });
        } else {
          throw new Error(`Unsupported hashType: ${hash.hashType}`);
        }
      } else {
        if (!u.email && !u.phone) {
          console.warn(`[users] skip ${u.$id}: no email or phone on source user`);
          continue;
        }
        const password = randomPassword();
        await destUsers.create({
          userId: u.$id,
          email: u.email || undefined,
          phone: u.phone || undefined,
          password,
          name: u.name || undefined,
        });
      }
      if (u.prefs && typeof u.prefs === 'object' && Object.keys(u.prefs).length > 0) {
        try {
          await destUsers.updatePrefs({ userId: u.$id, prefs: u.prefs });
        } catch (e) {
          console.warn(`[users] prefs update failed for ${u.$id}:`, e.message || e);
        }
      }
      if (u.labels && Array.isArray(u.labels) && u.labels.length > 0) {
        try {
          await destUsers.updateLabels({ userId: u.$id, labels: u.labels });
        } catch (e) {
          console.warn(`[users] labels update failed for ${u.$id}:`, e.message || e);
        }
      }
      console.log(`[users] migrated ${u.$id}`);
    } catch (e) {
      if (flags.skipExisting && isConflict(e)) {
        console.warn(`[users] skip user ${u.$id} (exists)`);
      } else throw e;
    }
  }
}

async function phaseTeams(ctx) {
  const { srcTeams, destTeams, flags } = ctx;

  const teams = await paginateCursor(async (queries) => {
    const r = await srcTeams.list({ queries });
    return r.teams || [];
  });

  for (const team of teams) {
    if (flags.dryRun) {
      console.log(`[teams] would create team ${team.$id} ${team.name}`);
    } else {
      try {
        await destTeams.create({ teamId: team.$id, name: team.name, roles: ['owner'] });
        console.log(`[teams] created team ${team.$id}`);
      } catch (e) {
        if (flags.skipExisting && isConflict(e)) console.warn(`[teams] skip team ${team.$id} (exists)`);
        else throw e;
      }
    }

    const memberships = await paginateCursor(async (queries) => {
      const r = await srcTeams.listMemberships({ teamId: team.$id, queries });
      return r.memberships || [];
    });

    for (const m of memberships) {
      if (!m.userId) continue;
      const roles = m.roles?.length ? m.roles : ['member'];
      if (flags.dryRun) {
        console.log(`[teams] would add member ${m.userId} to ${team.$id}`);
        continue;
      }
      try {
        await destTeams.createMembership({
          teamId: team.$id,
          userId: m.userId,
          roles,
        });
      } catch (e) {
        if (flags.skipExisting && (isConflict(e) || e.message?.includes('already'))) {
          console.warn(`[teams] skip membership ${team.$id}/${m.userId}`);
        } else throw e;
      }
    }
  }
}

async function phaseStorage(ctx) {
  const { srcStorage, destStorage, flags } = ctx;

  const buckets = await paginateCursor(async (queries) => {
    const r = await srcStorage.listBuckets({ queries });
    return r.buckets || [];
  });

  for (const b of buckets) {
    if (flags.dryRun) {
      console.log(`[storage] would ensure bucket ${b.$id}`);
    } else {
      try {
        await destStorage.createBucket({
          bucketId: b.$id,
          name: b.name,
          permissions: b.$permissions,
          fileSecurity: b.fileSecurity,
          enabled: b.enabled !== false,
          maximumFileSize: b.maximumFileSize,
          allowedFileExtensions: b.allowedFileExtensions,
          compression: b.compression,
          encryption: b.encryption,
          antivirus: b.antivirus,
          transformations: b.transformations,
        });
        console.log(`[storage] created bucket ${b.$id}`);
      } catch (e) {
        if (flags.skipExisting && isConflict(e)) console.warn(`[storage] skip bucket ${b.$id} (exists)`);
        else if (!flags.skipExisting) throw e;
      }
    }

    const files = await paginateCursor(async (queries) => {
      const r = await srcStorage.listFiles({ bucketId: b.$id, queries });
      return r.files || [];
    });

    for (const f of files) {
      if (flags.dryRun) {
        console.log(`[storage] would copy file ${b.$id}/${f.$id}`);
        continue;
      }
      try {
        const buf = await srcStorage.getFileDownload({ bucketId: b.$id, fileId: f.$id });
        const nodeBuf = Buffer.isBuffer(buf)
          ? buf
          : buf instanceof ArrayBuffer
            ? Buffer.from(buf)
            : buf instanceof Uint8Array
              ? Buffer.from(buf.buffer, buf.byteOffset, buf.byteLength)
              : Buffer.from(buf);
        const input = InputFile.fromBuffer(nodeBuf, f.name || f.$id);
        await destStorage.createFile({
          bucketId: b.$id,
          fileId: f.$id,
          file: input,
          permissions: f.$permissions,
        });
      } catch (e) {
        if (flags.skipExisting && isConflict(e)) console.warn(`[storage] skip file ${b.$id}/${f.$id}`);
        else throw e;
      }
    }
  }
}

async function phaseFunctionVars(ctx) {
  const { srcFn, destFn, flags } = ctx;
  const fns = await paginateCursor(async (queries) => {
    const r = await srcFn.list({ queries });
    return r.functions || [];
  });

  for (const fn of fns) {
    const vars = await srcFn.listVariables({ functionId: fn.$id });
    const list = vars.variables || [];
    for (const v of list) {
      if (flags.dryRun) {
        console.log(`[functions-vars] would set ${fn.$id} ${v.key}`);
        continue;
      }
      try {
        await destFn.createVariable({
          functionId: fn.$id,
          key: v.key,
          value: v.value ?? '',
          secret: Boolean(v.secret),
        });
      } catch (e) {
        if (flags.skipExisting && isConflict(e)) console.warn(`[functions-vars] skip ${fn.$id}/${v.key}`);
        else throw e;
      }
    }
  }
}

async function main() {
  const flags = parseArgs(process.argv.slice(2));
  if (flags.envFile) loadEnvFile(flags.envFile);
  if (flags.help) {
    printHelp();
    process.exit(0);
  }

  let only =
    flags.only && flags.only.length > 0
      ? [...flags.only]
      : ['schema', 'teams', 'documents', 'storage', 'functions-vars'];
  if (flags.migrateUsers && !only.includes('users')) {
    const i = only.indexOf('schema');
    only.splice(i >= 0 ? i + 1 : 0, 0, 'users');
  }

  const srcEndpoint = requireEnv('SOURCE_APPWRITE_ENDPOINT');
  const srcProject = requireEnv('SOURCE_APPWRITE_PROJECT_ID');
  const srcKey = requireEnv('SOURCE_APPWRITE_API_KEY');
  const destEndpoint = requireEnv('DEST_APPWRITE_ENDPOINT');
  const destProject = requireEnv('DEST_APPWRITE_PROJECT_ID');
  const destKey = requireEnv('DEST_APPWRITE_API_KEY');

  const srcClient = makeClient(srcEndpoint, srcProject, srcKey);
  const destClient = makeClient(destEndpoint, destProject, destKey);

  const ctx = {
    flags,
    srcDb: new Databases(srcClient),
    destDb: new Databases(destClient),
    srcTables: new TablesDB(srcClient),
    destTables: new TablesDB(destClient),
    srcStorage: new Storage(srcClient),
    destStorage: new Storage(destClient),
    srcTeams: new Teams(srcClient),
    destTeams: new Teams(destClient),
    srcUsers: new Users(srcClient),
    destUsers: new Users(destClient),
    srcFn: new Functions(srcClient),
    destFn: new Functions(destClient),
  };

  if (shouldRun('schema', only)) await phaseSchema();
  if (shouldRun('users', only)) await phaseUsers(ctx);
  if (shouldRun('teams', only)) await phaseTeams(ctx);
  if (shouldRun('documents', only)) await phaseDocuments(ctx);
  if (shouldRun('storage', only)) await phaseStorage(ctx);
  if (shouldRun('functions-vars', only)) await phaseFunctionVars(ctx);

  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
