/* eslint-disable no-unused-vars */
const crypto = require("crypto");
const sdk = require("node-appwrite");
const archiver = require("archiver");
const unzipper = require("unzipper");
const stream = require("stream");

async function streamToBuffer(readable) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

// --- Helper Functions ---
const parseMetadata = (content, type) => {
  const metadata = {};
  const lines = content.split("\n");
  const headerFields =
    type === "plugin"
      ? {
          "Plugin Name": "name",
          Version: "version",
          Author: "author",
          Description: "description",
        }
      : {
          "Theme Name": "name",
          Version: "version",
          Author: "author",
          Description: "description",
        };

  for (const line of lines) {
    for (const [header, key] of Object.entries(headerFields)) {
      if (
        line.toLowerCase().startsWith(` * ${header.toLowerCase()}:`) ||
        line.toLowerCase().startsWith(`${header.toLowerCase()}:`)
      ) {
        metadata[key] = line.substring(line.indexOf(":") + 1).trim();
        break;
      }
    }
  }
  return metadata;
};

function normalizeWpSlug(slug) {
  return String(slug || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

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
  if (!key) return { version: "", source: "official", is_default: false, s3_path: null };
  const e = versions[key];
  return {
    version: key,
    source: e.source,
    is_default: !!e.isDefault,
    s3_path: e.source === "local" && e.location ? e.location : null,
  };
}

// --- Main Handler ---
module.exports = async ({ req, res, log, error }) => {
  /**
   * Call s3-gateway to perform S3 operations
   */
  async function callS3Gateway(action, payload, log, error) {
    const endpoint = process.env.APPWRITE_FUNCTION_ENDPOINT ||
      process.env.APPWRITE_ENDPOINT ||
      process.env.APPWRITE_FUNCTION_API_ENDPOINT;
    const projectId = process.env.APPWRITE_FUNCTION_PROJECT_ID || process.env.APPWRITE_PROJECT_ID;
    const apiKey = process.env.APPWRITE_FUNCTION_API_KEY || process.env.APPWRITE_API_KEY || process.env.APPWRITE_KEY;

    const gatewayClient = new sdk.Client()
      .setEndpoint(endpoint)
      .setProject(projectId)
      .setKey(apiKey);

    const functions = new sdk.Functions(gatewayClient);
    const gatewayFunctionId = process.env.S3_GATEWAY_FUNCTION_ID || 's3-gateway';

    try {
      const response = await functions.createExecution(
        gatewayFunctionId,
        JSON.stringify({ action, payload }),
        true
      );

      if (!response.responseBody) {
        throw new Error('No response from s3-gateway');
      }

      const result = typeof response.responseBody === 'string'
        ? JSON.parse(response.responseBody)
        : response.responseBody;

      if (!result.success) {
        throw new Error(result.message || 'Gateway operation failed');
      }

      return result;
    } catch (err) {
      error(`s3-gateway call failed: ${err.message}`);
      throw err;
    }
  }

  const client = new sdk.Client();
  const storage = new sdk.Storage(client);

  // Get Appwrite config from process.env only
  const APPWRITE_FUNCTION_ENDPOINT =
    process.env.APPWRITE_FUNCTION_ENDPOINT ||
    process.env.APPWRITE_ENDPOINT ||
    process.env.APPWRITE_FUNCTION_API_ENDPOINT;
  const APPWRITE_FUNCTION_PROJECT_ID = process.env.APPWRITE_FUNCTION_PROJECT_ID || process.env.APPWRITE_PROJECT_ID;
  const APPWRITE_FUNCTION_API_KEY =
    process.env.APPWRITE_FUNCTION_API_KEY || process.env.APPWRITE_API_KEY || process.env.APPWRITE_KEY;
  const APPWRITE_FUNCTION_USER_ID = process.env.APPWRITE_FUNCTION_USER_ID || process.env.APPWRITE_USER_ID;

  if (!APPWRITE_FUNCTION_ENDPOINT || !APPWRITE_FUNCTION_PROJECT_ID || !APPWRITE_FUNCTION_API_KEY) {
    error("Appwrite environment variables are not set.");
    return res.json({ success: false, message: "Appwrite environment is not configured." }, 500);
  }

  let payload = {};
  try {
    if (req.payload) {
      payload = typeof req.payload === "string" ? JSON.parse(req.payload) : req.payload;
    } else if (req.bodyRaw) {
      payload = JSON.parse(req.bodyRaw);
    }
  } catch (e) {
    error("Failed to parse payload.");
    return res.json({ success: false, message: "Invalid request body. JSON expected." }, 400);
  }

  const { fileId, fileBase64, fileName, wpSlug: payloadWpSlug } = payload;
  if (!fileId && !fileBase64) {
    return res.json(
      { success: false, message: "Missing required field: fileId or fileBase64." },
      400
    );
  }
  try {
    const uid =
      payload.userId ||
      APPWRITE_FUNCTION_USER_ID ||
      (req.headers &&
        (req.headers["x-appwrite-user-id"] || req.headers["x-appwrite-function-user-id"]));
    if (!uid)
      return res.json(
        {
          success: false,
          message: "Unauthorized. User must be authenticated or provide userId in payload.",
        },
        401
      );

    log(
      `Starting zip parse (repack plugin root)` +
        (fileId
          ? ` for Appwrite fileId: ${fileId}`
          : ` for uploaded file: ${fileName || "unknown"}`)
    );

    let zipBuffer;
    if (fileId) {
      const fileStream = await storage.getFileDownload("library", fileId);
      zipBuffer = await streamToBuffer(fileStream);
    } else {
      let base64 = fileBase64;
      const matches = /^data:.*;base64,(.*)$/.exec(base64);
      if (matches) base64 = matches[1];
      zipBuffer = Buffer.from(base64, "base64");
    }

    const directory = await unzipper.Open.buffer(zipBuffer);
    const itemType = payload.type || "plugin";

    let extractedMetadata = {};
    let pluginRoot = null;

    for (const file of directory.files) {
      if (file.type !== "File") continue;
      const path = file.path.replace(/\\/g, "/");
      const parts = path.split("/");
      const isThemeStyle =
        itemType === "theme" && path.includes("style.css") && parts.length === 2;
      const isPluginMain =
        itemType === "plugin" && path.endsWith(".php") && parts.length === 2;

      if ((isThemeStyle || isPluginMain) && Object.keys(extractedMetadata).length === 0) {
        const contentBuffer = await file.buffer();
        const content = contentBuffer.toString("utf-8");

        try {
          const meta = parseMetadata(content, itemType);
          if (meta && meta.name) {
            extractedMetadata = { ...meta, slug: parts[0] };
            pluginRoot = parts[0];
            break;
          }
        } catch (e) {
          log(`Failed to parse metadata from ${path}: ${e.message}`);
        }
      }
    }

    if (!pluginRoot || !extractedMetadata.name) {
      return res.json(
        {
          success: false,
          message:
            itemType === "theme"
              ? "Could not find a valid theme (style.css with Theme Name) in the ZIP."
              : "Could not find a valid plugin (main PHP file with Plugin Name) in the ZIP.",
        },
        400
      );
    }

    const folderKey = fileId || `${Date.now()}-${crypto.randomBytes(8).toString("hex")}`;
    const slug =
      payloadWpSlug ||
      extractedMetadata.slug ||
      (fileName ? fileName.replace(/\.zip$/i, "") : "plugin");
    const safeZipName = `${String(slug).replace(/[^a-zA-Z0-9._-]/g, "_")}.zip`;
    const s3Key = `user/${uid}/library/${folderKey}/${safeZipName}`;

    const archive = archiver("zip", { zlib: { level: 9 } });
    const passThrough = new stream.PassThrough();
    archive.on("error", (e) => passThrough.destroy(e));
    archive.pipe(passThrough);

    // Collect zip data
    const zipChunks = [];
    passThrough.on('data', chunk => zipChunks.push(chunk));

    for (const file of directory.files) {
      if (file.type !== "File") continue;
      const path = file.path.replace(/\\/g, "/");
      if (path !== pluginRoot && !path.startsWith(`${pluginRoot}/`)) continue;
      const buf = await file.buffer();
      archive.append(buf, { name: path });
    }

    await archive.finalize();
    const zipBuffer = Buffer.concat(zipChunks);

    // Upload via s3-gateway
    const uploadResult = await callS3Gateway(
      'upload',
      {
        key: s3Key,
        body: zipBuffer.toString('base64'),
        contentType: 'application/zip',
      },
      log,
      error
    );

    log(`Uploaded plugin/theme root as single zip to S3 at ${s3Key}`);

    const uploadedFiles = [s3Key];

    const databaseId = process.env.APPWRITE_DATABASE_ID || process.env.DATABASE_ID || "platform_db";
    const collectionId = process.env.LIBRARY_COLLECTION_ID || "library";

    const s3Location = s3Key;
    const rawSlug =
      payloadWpSlug ||
      extractedMetadata.slug ||
      (fileName ? fileName.replace(".zip", "") : "");
    const normalizedSlug = normalizeWpSlug(rawSlug);
    const versionKey = String(extractedMetadata.version || "").trim() || "1.0.0";
    const typeLabel = itemType === "theme" ? "theme" : "plugin";

    let savedDoc;
    try {
      const databases = new sdk.Databases(client);
      const list = await databases.listDocuments(databaseId, collectionId, [
        sdk.Query.equal("user_id", uid),
        sdk.Query.equal("wpSlug", normalizedSlug),
        sdk.Query.equal("type", typeLabel),
      ]);

      let merged;
      let existingDoc = null;

      if (list.total > 0) {
        existingDoc = list.documents[0];
        const existing = getOrBuildVersionsMap(existingDoc);
        const hadKeys = Object.keys(existing).length;
        merged = { ...existing };
        merged[versionKey] = {
          source: "local",
          location: s3Location,
          isDefault: hadKeys === 0,
        };
        if (hadKeys > 0) {
          const defKey = pickDefaultVersionKey(existing);
          if (defKey) merged = setDefaultVersionInMap(merged, defKey);
        }
      } else {
        merged = {
          [versionKey]: {
            source: "local",
            location: s3Location,
            isDefault: true,
          },
        };
      }

      const mirror = mirrorLegacyFieldsFromVersions(merged);
      const docData = {
        name: extractedMetadata.name || fileName || "Untitled Plugin",
        description: extractedMetadata.description || "",
        author: extractedMetadata.author || "",
        type: typeLabel,
        user_id: uid,
        wpSlug: normalizedSlug,
        versions_json: JSON.stringify(merged),
        version: mirror.version,
        source: mirror.source,
        is_default: mirror.is_default,
        ...(mirror.s3_path ? { s3_path: mirror.s3_path } : {}),
      };

      if (existingDoc) {
        savedDoc = await databases.updateDocument(databaseId, collectionId, existingDoc.$id, docData);
        log(`Updated library document with new version: ${savedDoc.$id}`);
      } else {
        savedDoc = await databases.createDocument(databaseId, collectionId, sdk.ID.unique(), docData);
        log(`Created library document: ${savedDoc.$id}`);
      }
    } catch (dbErr) {
      log(`Failed to save library document: ${dbErr.message}`);
    }

    return res.json({
      success: true,
      message: "Zip validated, plugin root repackaged and uploaded to S3 as a single archive.",
      uploadedFiles,
      metadata: extractedMetadata,
      item: savedDoc,
    });
  } catch (e) {
    error(e.message);
    return res.json({ success: false, message: e.message }, 500);
  }
};
