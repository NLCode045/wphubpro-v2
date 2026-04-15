/**
 * library-delete-version – Remove one version from a library document (versions_json) or delete a legacy single-version row.
 * For local uploads, deletes the version's S3 object or prefix when applicable.
 */
const sdk = require("node-appwrite");
const { hasAppwriteBootstrap } = require("../../subscriptions/stripe-consumer/lib/appwriteEnv");
const { createServerClientAndDatabases } = require("../../database/fetchAppwriteCredentialsFromGateway");
const {
  S3Client,
  ListObjectsV2Command,
  DeleteObjectsCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");

function parseVersionsJson(raw) {
  if (!raw || typeof raw !== "string") return null;
  try {
    const o = JSON.parse(raw);
    if (!o || typeof o !== "object" || Array.isArray(o)) return null;
    const out = {};
    for (const [k, v] of Object.entries(o)) {
      if (!k || !v || typeof v !== "object") continue;
      const src = v.source;
      if (src !== "official" && src !== "local" && src !== "remote") continue;
      out[k] = {
        source: src,
        ...(v.location && String(v.location).trim() ? { location: String(v.location).trim() } : {}),
        isDefault: v.is_default === true || v.isDefault === true,
      };
    }
    return Object.keys(out).length > 0 ? out : null;
  } catch {
    return null;
  }
}

function getOrBuildVersionsMap(doc) {
  const p = parseVersionsJson(doc.versions_json);
  if (p && Object.keys(p).length > 0) return { ...p };
  const v = doc.version != null ? String(doc.version) : "";
  if (!v) return {};
  const source = String(doc.source ?? "official");
  const loc = (doc.s3_path || doc.s3Path || doc.remoteUrl || doc.remote_url || "").trim();
  return {
    [v]: {
      source,
      ...(loc ? { location: loc } : {}),
      isDefault: true,
    },
  };
}

function pickDefaultVersionKey(versions) {
  const keys = Object.keys(versions);
  if (!keys.length) return null;
  const def = keys.find((k) => versions[k].isDefault);
  return def ?? keys[0];
}

function setDefaultVersionInMap(versions, defaultVersionKey) {
  const next = {};
  for (const [k, v] of Object.entries(versions)) {
    next[k] = { ...v, isDefault: k === defaultVersionKey };
  }
  return next;
}

function mirrorLegacyFieldsFromVersions(versions) {
  const key = pickDefaultVersionKey(versions);
  if (!key) return { version: "", source: "official", is_default: false };
  const e = versions[key];
  return { version: key, source: e.source, is_default: !!e.isDefault };
}

async function deleteS3Path(s3, bucket, s3Path, log) {
  if (!s3Path || !bucket) return;
  if (s3Path.endsWith("/")) {
    const prefix = s3Path;
    let continuationToken;
    do {
      const listRes = await s3.send(
        new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: prefix,
          MaxKeys: 1000,
          ContinuationToken: continuationToken,
        })
      );
      const objects = listRes.Contents || [];
      if (objects.length > 0) {
        await s3.send(
          new DeleteObjectsCommand({
            Bucket: bucket,
            Delete: {
              Objects: objects.map((o) => ({ Key: o.Key })),
              Quiet: true,
            },
          })
        );
        log(`Deleted ${objects.length} objects from S3 under ${prefix}`);
      }
      continuationToken = listRes.IsTruncated ? listRes.NextContinuationToken : undefined;
    } while (continuationToken);
  } else {
    await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: s3Path }));
    log(`Deleted S3 object ${s3Path}`);
  }
}

module.exports = async ({ req, res, log, error }) => {
  const env = req?.variables && Object.keys(req.variables).length > 0 ? req.variables : process.env;

  const APPWRITE_USER_ID = env.APPWRITE_FUNCTION_USER_ID || req?.headers?.["x-appwrite-user-id"];

  let S3_BUCKET = env.S3_BUCKET;
  let S3_REGION = env.S3_REGION;
  let S3_ACCESS_KEY_ID = env.S3_ACCESS_KEY_ID;
  let S3_SECRET_ACCESS_KEY = env.S3_SECRET_ACCESS_KEY;

  if (!hasAppwriteBootstrap()) {
    return res.json({ success: false, message: "Appwrite config missing." }, 500);
  }

  let databases;
  try {
    ({ databases } = await createServerClientAndDatabases(log, error));
  } catch (e) {
    log("Could not resolve Appwrite credentials: " + e.message);
    return res.json({ success: false, message: "Appwrite config missing." }, 500);
  }

  if (!S3_BUCKET || !S3_REGION || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY) {
    try {
      const settingsList = await databases.listDocuments("platform_db", "platform_settings", [
        sdk.Query.equal("key", "s3"),
      ]);
      if (settingsList.total > 0) {
        const s3settings = JSON.parse(settingsList.documents[0].value || "{}");
        S3_BUCKET = s3settings.bucket || S3_BUCKET;
        S3_REGION = s3settings.region || S3_REGION;
        S3_ACCESS_KEY_ID = s3settings.accessKey || S3_ACCESS_KEY_ID;
        S3_SECRET_ACCESS_KEY = s3settings.secretKey || S3_SECRET_ACCESS_KEY;
      }
    } catch (e) {
      log("Could not load S3 settings: " + e.message);
    }
  }

  if (!APPWRITE_USER_ID) {
    return res.json({ success: false, message: "Unauthorized. User must be authenticated." }, 401);
  }

  let payload = {};
  try {
    if (req.payload) {
      payload = typeof req.payload === "string" ? JSON.parse(req.payload) : req.payload;
    } else if (req.bodyRaw) {
      payload = JSON.parse(req.bodyRaw);
    }
  } catch (e) {
    return res.json({ success: false, message: "Invalid JSON payload." }, 400);
  }

  const { libraryItemId, libraryDocumentId, versionKey } = payload;

  const databaseId = env.APPWRITE_DATABASE_ID || env.DATABASE_ID || "platform_db";
  const collectionId = env.LIBRARY_COLLECTION_ID || "library";

  const s3Configured = S3_BUCKET && S3_REGION && S3_ACCESS_KEY_ID && S3_SECRET_ACCESS_KEY;
  const s3 = s3Configured
    ? new S3Client({
        region: S3_REGION,
        credentials: {
          accessKeyId: S3_ACCESS_KEY_ID,
          secretAccessKey: S3_SECRET_ACCESS_KEY,
        },
      })
    : null;

  try {
    // --- Remove one version from a multi-version document ---
    if (libraryDocumentId && versionKey) {
      const doc = await databases.getDocument(databaseId, collectionId, libraryDocumentId);

      if (doc.user_id !== APPWRITE_USER_ID) {
        return res.json({ success: false, message: "Forbidden. You do not own this library item." }, 403);
      }

      const map = getOrBuildVersionsMap(doc);
      if (!map[versionKey]) {
        return res.json({ success: false, message: "Version not found on this document." }, 404);
      }

      const removed = map[versionKey];
      const nextMap = { ...map };
      delete nextMap[versionKey];

      const remainingKeys = Object.keys(nextMap);
      if (removed.source === "local" && removed.location && s3) {
        await deleteS3Path(s3, S3_BUCKET, removed.location, log);
      }

      if (remainingKeys.length === 0) {
        await databases.deleteDocument(databaseId, collectionId, libraryDocumentId);
        log(`Deleted library document ${libraryDocumentId} (no versions left)`);
        return res.json({ success: true, message: "Library item removed." });
      }

      let normalized = nextMap;
      if (removed.isDefault && remainingKeys.length > 0) {
        normalized = setDefaultVersionInMap(nextMap, remainingKeys[0]);
      }

      const mirror = mirrorLegacyFieldsFromVersions(normalized);
      await databases.updateDocument(databaseId, collectionId, libraryDocumentId, {
        versions_json: JSON.stringify(normalized),
        version: mirror.version,
        source: mirror.source,
        is_default: mirror.is_default,
      });
      log(`Removed version ${versionKey} from library document ${libraryDocumentId}`);
      return res.json({ success: true, message: "Version removed." });
    }

    // --- Legacy: delete by document id ---
    if (!libraryItemId) {
      return res.json(
        { success: false, message: "Missing libraryItemId or libraryDocumentId + versionKey." },
        400
      );
    }

    const doc = await databases.getDocument(databaseId, collectionId, libraryItemId);

    if (doc.user_id !== APPWRITE_USER_ID) {
      return res.json({ success: false, message: "Forbidden. You do not own this library item." }, 403);
    }

    const map = getOrBuildVersionsMap(doc);
    const keys = Object.keys(map);
    if (keys.length > 1) {
      return res.json(
        {
          success: false,
          message:
            "This library entry has multiple versions. Pass libraryDocumentId and versionKey to remove one version.",
        },
        400
      );
    }

    let s3PathToDelete = null;
    if (keys.length === 1) {
      const e = map[keys[0]];
      if (e && e.source === "local" && e.location) s3PathToDelete = e.location;
    }
    if (!s3PathToDelete && doc.source === "local" && (doc.s3_path || doc.s3Path)) {
      s3PathToDelete = doc.s3_path || doc.s3Path;
    }

    if (s3PathToDelete && s3) {
      await deleteS3Path(s3, S3_BUCKET, s3PathToDelete, log);
    }

    await databases.deleteDocument(databaseId, collectionId, libraryItemId);
    log(`Deleted library document ${libraryItemId}`);

    return res.json({
      success: true,
      message: "Library item removed.",
    });
  } catch (e) {
    if (e.code === 404) {
      return res.json({ success: false, message: "Library item not found." }, 404);
    }
    error(e.message);
    return res.json({ success: false, message: e.message || "Delete failed." }, 500);
  }
};
