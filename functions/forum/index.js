/**
 * Forum function: categories, threads, posts
 * Actions: listCategories, listThreads, createThread, getThread, addPost
 */
const sdk = require("node-appwrite");

function parsePayload(req) {
  if (!req) return {};
  if (req.body && typeof req.body === "object") return req.body;
  if (req.payload && typeof req.payload === "object") return req.payload;
  const raw = req.payload || req.bodyRaw || req.body;
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return {};
    return JSON.parse(trimmed);
  }
  return {};
}

function createClient(sdkLib, { endpoint, projectId, apiKey }) {
  const client = new sdkLib.Client().setEndpoint(endpoint).setProject(projectId);
  if (apiKey) client.setKey(apiKey);
  return client;
}

function ok(res, payload = {}, statusCode = 200) {
  return res.json(payload, statusCode);
}

function fail(res, message, statusCode = 500, extra = {}) {
  return res.json({ success: false, message, ...extra }, statusCode);
}

const DATABASE_ID = "platform_db";
const CATEGORIES_COLLECTION = "forum_categories";
const THREADS_COLLECTION = "forum_threads";
const POSTS_COLLECTION = "forum_posts";

const DEFAULT_CATEGORIES = [
  { key: "general", name: "General", description: "General platform discussion", order: 0 },
  { key: "platform_features", name: "Platform Features", description: "Feature requests and platform feedback", order: 1 },
  { key: "wordpress_dev", name: "WordPress Development", description: "WordPress development tips and questions", order: 2 },
  { key: "plugins_themes", name: "Plugins & Themes", description: "WordPress plugins and themes discussion", order: 3 },
  { key: "error_reporting", name: "Error Reporting", description: "Report and discuss errors", order: 4 },
];

module.exports = async ({ req, res, log, error }) => {
  const endpoint = process.env.APPWRITE_ENDPOINT || process.env.APPWRITE_FUNCTION_ENDPOINT;
  const projectId = process.env.APPWRITE_PROJECT_ID || process.env.APPWRITE_FUNCTION_PROJECT_ID;
  const apiKey = process.env.APPWRITE_API_KEY || process.env.APPWRITE_FUNCTION_API_KEY || process.env.APPWRITE_KEY;
  if (!endpoint || !projectId || !apiKey) {
    return fail(res, "Function environment not configured", 500);
  }

  const client = createClient(sdk, { endpoint, projectId, apiKey });
  const databases = new sdk.Databases(client);
  const userId = req.headers["x-appwrite-user-id"] || process.env.APPWRITE_FUNCTION_USER_ID;

  const payload = parsePayload(req);
  const action = payload.action || "listCategories";

  try {
    if (action === "listCategories") {
      const result = await databases.listDocuments(DATABASE_ID, CATEGORIES_COLLECTION, [
        sdk.Query.orderAsc("order"),
        sdk.Query.limit(20),
      ]);
      if (result.total === 0) {
        for (const cat of DEFAULT_CATEGORIES) {
          await databases.createDocument(DATABASE_ID, CATEGORIES_COLLECTION, sdk.ID.unique(), {
            key: cat.key,
            name: cat.name,
            description: cat.description,
            order: cat.order,
          });
        }
        const again = await databases.listDocuments(DATABASE_ID, CATEGORIES_COLLECTION, [
          sdk.Query.orderAsc("order"),
          sdk.Query.limit(20),
        ]);
        return ok(res, { categories: again.documents });
      }
      return ok(res, { categories: result.documents });
    }

    if (action === "listThreads") {
      const { categoryId, limit, offset } = payload;
      const queries = [sdk.Query.orderDesc("last_post_at"), sdk.Query.limit(limit || 30), sdk.Query.offset(offset || 0)];
      if (categoryId) queries.unshift(sdk.Query.equal("category_id", categoryId));

      const result = await databases.listDocuments(DATABASE_ID, THREADS_COLLECTION, queries);
      return ok(res, { threads: result.documents, total: result.total });
    }

    if (action === "createThread") {
      if (!userId) return fail(res, "Unauthorized", 401);
      const { categoryId, title, body } = payload;
      if (!categoryId || !title || !title.trim() || !body || !body.trim()) {
        return fail(res, "Missing categoryId, title, or body", 400);
      }

      const thread = await databases.createDocument(DATABASE_ID, THREADS_COLLECTION, sdk.ID.unique(), {
        category_id: categoryId,
        user_id: userId,
        title: title.trim(),
        post_count: 1,
        last_post_at: new Date().toISOString(),
      });

      await databases.createDocument(DATABASE_ID, POSTS_COLLECTION, sdk.ID.unique(), {
        thread_id: thread.$id,
        user_id: userId,
        body: body.trim(),
      });

      return ok(res, { thread, success: true });
    }

    if (action === "getThread") {
      const { threadId } = payload;
      if (!threadId) return fail(res, "Missing threadId", 400);

      const thread = await databases.getDocument(DATABASE_ID, THREADS_COLLECTION, threadId);
      const posts = await databases.listDocuments(DATABASE_ID, POSTS_COLLECTION, [
        sdk.Query.equal("thread_id", threadId),
        sdk.Query.orderAsc("$createdAt"),
      ]);

      return ok(res, { thread, posts: posts.documents });
    }

    if (action === "addPost") {
      if (!userId) return fail(res, "Unauthorized", 401);
      const { threadId, body } = payload;
      if (!threadId || !body || !body.trim()) return fail(res, "Missing threadId or body", 400);

      const thread = await databases.getDocument(DATABASE_ID, THREADS_COLLECTION, threadId);
      const postCount = (thread.post_count || 0) + 1;

      await databases.createDocument(DATABASE_ID, POSTS_COLLECTION, sdk.ID.unique(), {
        thread_id: threadId,
        user_id: userId,
        body: body.trim(),
      });

      await databases.updateDocument(DATABASE_ID, THREADS_COLLECTION, threadId, {
        post_count: postCount,
        last_post_at: new Date().toISOString(),
      });

      return ok(res, { success: true });
    }

    return fail(res, "Unknown action: " + action, 400);
  } catch (e) {
    error(e.message);
    return fail(res, e.message || "Internal error", 500);
  }
};
