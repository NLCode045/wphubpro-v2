/**
 * appwrite-gateway: Central Appwrite Admin API gateway
 *
 * This gateway:
 * - Holds admin Appwrite API key
 * - Performs sensitive admin operations (user management, bulk writes, etc.)
 * - Exposes controlled operations to internal functions
 * - Enforces authorization checks
 *
 * Consumers: admin-manage-users, bulk-operations, system functions
 */
const sdk = require('node-appwrite');
const { validateGatewayEnvironment, parsePayload } = require('https://69d42466001bf3811c6a.functions.wphub.pro');

// Response helpers
function success(res, data = {}, status = 200) {
  return res.json({ success: true, ...data }, status);
}

function fail(res, message, status = 500) {
  return res.json({ success: false, message }, status);
}

/**
 * Route handler for Appwrite admin operations
 */
async function handleAppwriteOperation(req, res, log, error, action, adminClient, payload) {
  try {
    const databases = new sdk.Databases(adminClient);
    const users = new sdk.Users(adminClient);

    switch (action) {
      case 'list-documents':
        return await listDocuments(databases, res, log, payload);

      case 'create-document':
        return await createDocument(databases, res, log, error, payload);

      case 'update-document':
        return await updateDocument(databases, res, log, error, payload);

      case 'delete-document':
        return await deleteDocument(databases, res, log, error, payload);

      case 'list-users':
        return await listUsers(users, res, log, payload);

      case 'get-user':
        return await getUser(users, res, log, payload);

      case 'update-user-labels':
        return await updateUserLabels(users, res, log, error, payload);

      default:
        return fail(res, `Unknown action: ${action}`, 400);
    }
  } catch (err) {
    error(`appwrite-gateway error: ${err.message}`);
    return fail(res, err.message || 'Appwrite operation failed', 500);
  }
}

// --- Appwrite Operations ---

async function listDocuments(databases, res, log, payload) {
  const { database_id, collection_id, limit, offset, queries } = payload;

  if (!database_id || !collection_id) {
    return fail(res, 'database_id and collection_id required', 400);
  }

  try {
    const docs = await databases.listDocuments(
      database_id,
      collection_id,
      queries || [],
      Math.min(parseInt(limit) || 25, 100),
      Math.max(0, parseInt(offset) || 0)
    );

    return success(res, { documents: docs.documents, total: docs.total });
  } catch (err) {
    return fail(res, err.message, 500);
  }
}

async function createDocument(databases, res, log, error, payload) {
  const { database_id, collection_id, document_id, data } = payload;

  if (!database_id || !collection_id || !data) {
    return fail(res, 'database_id, collection_id, and data required', 400);
  }

  try {
    const doc = await databases.createDocument(
      database_id,
      collection_id,
      document_id || sdk.ID.unique(),
      data
    );

    log(`Created document: ${doc.$id}`);
    return success(res, { document: doc });
  } catch (err) {
    error(`Create failed: ${err.message}`);
    return fail(res, err.message, 400);
  }
}

async function updateDocument(databases, res, log, error, payload) {
  const { database_id, collection_id, document_id, data } = payload;

  if (!database_id || !collection_id || !document_id || !data) {
    return fail(res, 'database_id, collection_id, document_id, and data required', 400);
  }

  try {
    const doc = await databases.updateDocument(
      database_id,
      collection_id,
      document_id,
      data
    );

    log(`Updated document: ${doc.$id}`);
    return success(res, { document: doc });
  } catch (err) {
    error(`Update failed: ${err.message}`);
    return fail(res, err.message, 400);
  }
}

async function deleteDocument(databases, res, log, error, payload) {
  const { database_id, collection_id, document_id } = payload;

  if (!database_id || !collection_id || !document_id) {
    return fail(res, 'database_id, collection_id, and document_id required', 400);
  }

  try {
    await databases.deleteDocument(database_id, collection_id, document_id);
    log(`Deleted document: ${document_id}`);
    return success(res, { deleted: true });
  } catch (err) {
    error(`Delete failed: ${err.message}`);
    return fail(res, err.message, 400);
  }
}

async function listUsers(users, res, log, payload) {
  try {
    const limit = Math.min(parseInt(payload.limit) || 25, 100);
    const offset = Math.max(0, parseInt(payload.offset) || 0);

    const result = await users.list(limit, offset);
    return success(res, { users: result.users, total: result.total });
  } catch (err) {
    return fail(res, err.message, 500);
  }
}

async function getUser(users, res, log, payload) {
  const { user_id } = payload;
  if (!user_id) return fail(res, 'user_id required', 400);

  try {
    const user = await users.get(user_id);
    return success(res, { user });
  } catch (err) {
    return fail(res, err.message, 404);
  }
}

async function updateUserLabels(users, res, log, error, payload) {
  const { user_id, labels } = payload;

  if (!user_id || !Array.isArray(labels)) {
    return fail(res, 'user_id and labels array required', 400);
  }

  try {
    const user = await users.updateLabels(user_id, labels);
    log(`Updated labels for user: ${user_id}`);
    return success(res, { user });
  } catch (err) {
    error(`Label update failed: ${err.message}`);
    return fail(res, err.message, 400);
  }
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

    // Parse action from request
    const payload = parsePayload(req);
    const action = String(payload.action || req.query?.action || '').toLowerCase().trim();

    if (!action) {
      return fail(res, 'action parameter required', 400);
    }

    // Route to appropriate handler
    return await handleAppwriteOperation(req, res, log, error, action, adminClient, payload);
  } catch (err) {
    error(`appwrite-gateway fatal error: ${err.message}`);
    return fail(res, 'Gateway initialization failed', 500);
  }
};
