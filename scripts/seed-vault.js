#!/usr/bin/env node
/**
 * Seed the vault database with encrypted credentials from .env
 * Usage: node scripts/seed-vault.js
 *
 * This script reads credentials from .env and inserts them into vault.connectors table
 * with AES-256-GCM encryption.
 */

const fs = require('fs');
const path = require('path');
const { Client, Databases, ID } = require('node-appwrite');
const { encryptPayload } = require('../functions/database/appwrite-gateway/lib/vault-crypto.js');

// Load .env file
function loadEnv(envPath) {
  if (!fs.existsSync(envPath)) {
    throw new Error(`.env file not found at ${envPath}`);
  }
  const content = fs.readFileSync(envPath, 'utf-8');
  const env = {};
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...valueParts] = trimmed.split('=');
    if (key) {
      env[key.trim()] = valueParts.join('=').trim();
    }
  }
  return env;
}

async function seedVault() {
  const envPath = path.resolve(__dirname, '../.env');
  const env = loadEnv(envPath);

  // Validate required env vars
  const requiredVars = [
    'APPWRITE_ENDPOINT',
    'APPWRITE_PROJECT_ID',
    'APPWRITE_API_KEY',
    'ENCRYPTION_KEY',
  ];
  for (const key of requiredVars) {
    if (!env[key]) {
      throw new Error(`Missing required env var: ${key}`);
    }
  }

  // Initialize Appwrite client
  const client = new Client()
    .setEndpoint(env.APPWRITE_ENDPOINT)
    .setProject(env.APPWRITE_PROJECT_ID)
    .setKey(env.APPWRITE_API_KEY);

  const databases = new Databases(client);
  const vaultDbId = '69d2ecf3000f449c752f';
  const connectorsTableId = 'connectors';

  console.log('Starting vault credential migration...\n');

  // Prepare credential entries
  const entries = [];

  // Stripe
  if (env.STRIPE_SECRET_KEY || env.STRIPE_WEBHOOK_SECRET || env.STRIPE_PUBLISHABLE_KEY) {
    entries.push({
      provider: 'stripe',
      payload: {
        STRIPE_SECRET_KEY: env.STRIPE_SECRET_KEY || '',
        STRIPE_WEBHOOK_SECRET: env.STRIPE_WEBHOOK_SECRET || '',
        STRIPE_PUBLISHABLE_KEY: env.STRIPE_PUBLISHABLE_KEY || '',
      },
    });
    console.log('✓ Prepared Stripe credentials');
  }

  // S3
  if (env.S3_ACCESS_KEY_ID || env.S3_SECRET_ACCESS_KEY) {
    entries.push({
      provider: 's3',
      payload: {
        S3_ACCESS_KEY_ID: env.S3_ACCESS_KEY_ID || '',
        S3_SECRET_ACCESS_KEY: env.S3_SECRET_ACCESS_KEY || '',
        S3_BUCKET: env.S3_BUCKET || '',
        S3_REGION: env.S3_REGION || '',
      },
    });
    console.log('✓ Prepared S3 credentials');
  }

  // Gemini
  if (env.GEMINI_API_KEY) {
    entries.push({
      provider: 'gemini',
      payload: {
        GEMINI_API_KEY: env.GEMINI_API_KEY || '',
        GEMINI_MODEL: env.GEMINI_MODEL || 'gemini-2.0-flash',
      },
    });
    console.log('✓ Prepared Gemini credentials');
  }

  // Google API
  if (env.GOOGLE_API_KEY) {
    entries.push({
      provider: 'google_api',
      payload: {
        GOOGLE_API_KEY: env.GOOGLE_API_KEY || '',
      },
    });
    console.log('✓ Prepared Google API credentials');
  }

  // Canonical Appwrite server API key (read by appwrite-gateway)
  entries.push({
    provider: 'appwrite',
    payload: {
      APPWRITE_API_KEY: env.APPWRITE_API_KEY,
    },
  });
  console.log('✓ Prepared Appwrite server key (vault connector appwrite)');

  console.log(`\nEncrypting and inserting ${entries.length} credential entries...\n`);

  // Insert or update each entry
  for (const entry of entries) {
    try {
      const encrypted = encryptPayload(entry.payload, env.ENCRYPTION_KEY);

      // Try to get existing document
      let doc;
      try {
        doc = await databases.getDocument(vaultDbId, connectorsTableId, entry.provider);
      } catch (err) {
        if (err.code !== 404) throw err;
        doc = null;
      }

      if (doc) {
        // Update existing
        await databases.updateDocument(vaultDbId, connectorsTableId, entry.provider, {
          encrypted_payload: encrypted,
        });
        console.log(`✓ Updated credentials for provider: ${entry.provider}`);
      } else {
        // Create new
        await databases.createDocument(vaultDbId, connectorsTableId, entry.provider, {
          provider: entry.provider,
          encrypted_payload: encrypted,
          iv: '', // IV is stored in the encrypted payload itself
        });
        console.log(`✓ Created credentials for provider: ${entry.provider}`);
      }
    } catch (err) {
      console.error(`✗ Failed to seed credentials for ${entry.provider}: ${err.message}`);
      throw err;
    }
  }

  console.log('\n✓ Vault seeding completed successfully!');
  console.log('\nNext steps:');
  console.log('1. Verify credentials are encrypted in the vault.connectors table');
  console.log('2. Update functions to use getConnectorCredentials() from vault-client');
  console.log('3. Test credential retrieval in each function');
  console.log('4. Remove credential env vars from appwrite.config.json');
}

seedVault().catch((err) => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
