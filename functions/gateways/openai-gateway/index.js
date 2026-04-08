/**
 * openai-gateway: Central OpenAI API gateway
 *
 * This gateway:
 * - Holds sole access to OpenAI/Gemini credentials in the vault
 * - Performs all AI/LLM API operations (completions, embeddings, etc.)
 * - Exposes clean AI operations to other functions
 * - Never exposes raw credentials to callers
 *
 * Consumers: health-ai-agent, content-generation, embeddings functions
 */
const sdk = require('node-appwrite');
const fetch = require('node-fetch');
const crypto = require('crypto');

/**
 * Derive a consistent 32-byte key from the encryption key string using SHA256
 */
function deriveKey(encryptionKey) {
  return crypto.createHash('sha256').update(String(encryptionKey), 'utf8').digest();
}

/**
 * Decrypt a payload encrypted with AES-256-GCM
 * Input format: "iv:encryptedData:authTag" (all hex-encoded)
 */
function decryptPayload(encryptedPayload, encryptionKey) {
  if (!encryptedPayload || typeof encryptedPayload !== 'string') {
    throw new Error('encryptedPayload must be a non-empty string');
  }
  if (!encryptionKey || typeof encryptionKey !== 'string') {
    throw new Error('encryptionKey must be a non-empty string');
  }

  const parts = encryptedPayload.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted payload format');
  }

  try {
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = Buffer.from(parts[1], 'hex');
    const authTag = Buffer.from(parts[2], 'hex');

    if (iv.length !== 12) {
      throw new Error('Invalid IV length');
    }

    const key = deriveKey(encryptionKey);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return JSON.parse(decrypted.toString('utf8'));
  } catch (err) {
    throw new Error(`Decryption failed: ${err.message}`);
  }
}

/**
 * Retrieve provider credentials from vault database
 */
async function getProviderCredentials(provider, encryptionKey, databases, vaultDbId) {
  if (!provider || typeof provider !== 'string') {
    throw new Error('provider must be a non-empty string');
  }
  if (!encryptionKey || typeof encryptionKey !== 'string') {
    throw new Error('encryptionKey must be a non-empty string');
  }
  if (!databases) {
    throw new Error('databases client is required');
  }
  if (!vaultDbId || typeof vaultDbId !== 'string') {
    throw new Error('vaultDbId must be a non-empty string');
  }

  try {
    const doc = await databases.getDocument(vaultDbId, 'connectors', provider);

    if (!doc || !doc.encrypted_payload) {
      throw new Error(`Credentials for provider '${provider}' not found in vault`);
    }

    const credentials = decryptPayload(doc.encrypted_payload, encryptionKey);
    return credentials;
  } catch (err) {
    if (err.code === 404) {
      throw new Error(`Provider '${provider}' not found in vault`);
    }
    throw err;
  }
}

/**
 * Validate environment configuration for gateway functions
 */
function validateGatewayEnvironment() {
  const required = [
    'ENCRYPTION_KEY',
    'APPWRITE_ENDPOINT',
    'APPWRITE_PROJECT_ID',
    'APPWRITE_API_KEY',
  ];

  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  return {
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
    APPWRITE_ENDPOINT: process.env.APPWRITE_ENDPOINT,
    APPWRITE_PROJECT_ID: process.env.APPWRITE_PROJECT_ID,
    APPWRITE_API_KEY: process.env.APPWRITE_API_KEY,
    VAULT_DB_ID: process.env.VAULT_DB_ID || '69d2ecf3000f449c752f',
  };
}

/**
 * Parse request payload from various formats
 */
function parsePayload(req) {
  if (!req) return {};
  if (req.body && typeof req.body === 'object') return req.body;
  if (req.bodyRaw && typeof req.bodyRaw === 'string') {
    try {
      return JSON.parse(req.bodyRaw);
    } catch {
      return {};
    }
  }
  if (req.payload && typeof req.payload === 'string') {
    try {
      return JSON.parse(req.payload);
    } catch {
      return {};
    }
  }
  if (req.payload && typeof req.payload === 'object') return req.payload;
  return {};
}

// Response helpers
function success(res, data = {}, status = 200) {
  return res.json({ success: true, ...data }, status);
}

function fail(res, message, status = 500) {
  return res.json({ success: false, message }, status);
}

/**
 * Initialize AI provider credentials from vault
 */
async function initializeAICredentials(databases, config, provider = 'gemini') {
  try {
    const aiCredentials = await getProviderCredentials(
      provider,
      config.ENCRYPTION_KEY,
      databases,
      config.VAULT_DB_ID
    );

    if (provider === 'gemini') {
      if (!aiCredentials.GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY not found in vault');
      }
      return {
        provider: 'gemini',
        apiKey: aiCredentials.GEMINI_API_KEY,
        model: aiCredentials.GEMINI_MODEL || 'gemini-2.0-flash',
      };
    }

    throw new Error(`Unknown AI provider: ${provider}`);
  } catch (err) {
    throw new Error(`Failed to initialize AI credentials: ${err.message}`);
  }
}

/**
 * Route handler for AI operations
 */
async function handleAIOperation(req, res, log, error, action, credentials, payload) {
  try {
    switch (action) {
      case 'generate-content':
        return await generateContent(credentials, res, log, error, payload);

      case 'analyze':
        return await analyze(credentials, res, log, error, payload);

      default:
        return fail(res, `Unknown action: ${action}`, 400);
    }
  } catch (err) {
    error(`openai-gateway error: ${err.message}`);
    return fail(res, err.message || 'AI operation failed', 500);
  }
}

// --- AI Operations ---

async function generateContent(credentials, res, log, error, payload) {
  const { prompt, system_prompt, temperature, max_tokens } = payload;

  if (!prompt) {
    return fail(res, 'prompt required', 400);
  }

  if (credentials.provider === 'gemini') {
    return await generateContentGemini(credentials, res, log, error, {
      prompt,
      system_prompt,
      temperature: temperature || 0.7,
      max_tokens: max_tokens || 2048,
    });
  }

  return fail(res, `Unsupported AI provider: ${credentials.provider}`, 400);
}

async function generateContentGemini(credentials, res, log, error, config) {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(credentials.model)}:generateContent?key=${encodeURIComponent(credentials.apiKey)}`;

    const requestBody = {
      systemInstruction: config.system_prompt ? { parts: [{ text: config.system_prompt }] } : undefined,
      contents: [
        {
          role: 'user',
          parts: [{ text: config.prompt }],
        },
      ],
      generationConfig: {
        temperature: config.temperature,
        maxOutputTokens: config.max_tokens,
        responseMimeType: 'application/json',
      },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    if (!response.ok) {
      error(`Gemini API error: ${JSON.stringify(data)}`);
      return fail(res, 'Content generation failed', response.status);
    }

    const content = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) {
      return fail(res, 'No content generated', 500);
    }

    log('Generated content via Gemini');
    return success(res, { content, model: credentials.model });
  } catch (err) {
    error(`Gemini generation error: ${err.message}`);
    return fail(res, err.message, 500);
  }
}

async function analyze(credentials, res, log, error, payload) {
  const { data, analysis_type } = payload;

  if (!data) {
    return fail(res, 'data required for analysis', 400);
  }

  if (credentials.provider === 'gemini') {
    return await analyzeGemini(credentials, res, log, error, {
      data,
      analysis_type: analysis_type || 'general',
    });
  }

  return fail(res, `Unsupported AI provider: ${credentials.provider}`, 400);
}

async function analyzeGemini(credentials, res, log, error, config) {
  try {
    const systemPrompt = buildAnalysisSystemPrompt(config.analysis_type);

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(credentials.model)}:generateContent?key=${encodeURIComponent(credentials.apiKey)}`;

    const requestBody = {
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [
        {
          role: 'user',
          parts: [{ text: JSON.stringify(config.data) }],
        },
      ],
      generationConfig: {
        temperature: 0.3,
        responseMimeType: 'application/json',
      },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    if (!response.ok) {
      error(`Gemini API error: ${JSON.stringify(data)}`);
      return fail(res, 'Analysis failed', response.status);
    }

    let analysis;
    try {
      const content = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      analysis = JSON.parse(content);
    } catch {
      analysis = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Analysis complete';
    }

    log(`Completed ${config.analysis_type} analysis`);
    return success(res, { analysis });
  } catch (err) {
    error(`Gemini analysis error: ${err.message}`);
    return fail(res, err.message, 500);
  }
}

function buildAnalysisSystemPrompt(analysisType) {
  const prompts = {
    general: 'You are an analysis assistant. Analyze the provided data and return insights as JSON.',
    site_health: 'You are a WordPress Site Health assistant. Analyze the health checks and return recommendations as JSON.',
    content: 'You are a content analysis assistant. Analyze the content and return structured feedback as JSON.',
  };

  return prompts[analysisType] || prompts.general;
}

// --- Main Handler ---
module.exports = async ({ req, res, log, error }) => {
  try {
    const config = validateGatewayEnvironment();

    // Initialize Appwrite admin client
    const adminClient = new sdk.Client()
      .setEndpoint(config.APPWRITE_ENDPOINT)
      .setProject(config.APPWRITE_PROJECT_ID)
      .setKey(config.APPWRITE_API_KEY);

    const databases = new sdk.Databases(adminClient);

    // Initialize AI credentials
    const credentials = await initializeAICredentials(databases, config);

    // Parse action from request
    const payload = parsePayload(req);
    const action = String(payload.action || req.query?.action || '').toLowerCase().trim();

    if (!action) {
      return fail(res, 'action parameter required', 400);
    }

    // Route to appropriate handler
    return await handleAIOperation(req, res, log, error, action, credentials, payload);
  } catch (err) {
    error(`openai-gateway fatal error: ${err.message}`);
    return fail(res, 'Gateway initialization failed', 500);
  }
};
