/**
 * Conversations: mailbox threads, messages, per-mailbox placements (folders).
 * Actions: getMailboxContext, getOrCreateConversation, sendMessage, getConversation,
 *          listConversationsForMailbox, listPlacementsForMailboxFolder,
 *          listThreadsForMailboxFolder, removeConversationFromMailbox
 */
const sdk = require("node-appwrite");
const { hasAppwriteBootstrap } = require("../../subscriptions/stripe-consumer/lib/appwriteEnv");
const { createServerClientAndDatabases } = require("../../database/fetchAppwriteCredentialsFromGateway");

const DATABASE_ID = "platform_db";
const ACCOUNTS_COLLECTION = "accounts";
const CONVERSATIONS_COLLECTION = "conversations";
const CONVERSATION_MESSAGES_COLLECTION = "conversation_messages";
const PLACEMENTS_COLLECTION = "conversation_message_placements";
const TICKETS_COLLECTION = "tickets";

const FOLDER_INBOX = "inbox";
const FOLDER_SENT = "sent";

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

function ok(res, payload = {}, statusCode = 200) {
  return res.json(payload, statusCode);
}

function fail(res, message, statusCode = 500, extra = {}) {
  return res.json({ success: false, message, ...extra }, statusCode);
}

function adminTeamId() {
  return process.env.APPWRITE_ADMIN_TEAM_ID || "admin";
}

function uniqStrings(arr) {
  return [...new Set((arr || []).map((s) => String(s).trim()).filter(Boolean))];
}

async function getTeamDisplayName(teams, teamId) {
  let teamDisplayName = "Support";
  try {
    const tm = await teams.get(teamId);
    const n = tm.name && String(tm.name).trim();
    if (n) teamDisplayName = n;
  } catch (_) {}
  return teamDisplayName;
}

function displayNameFromUserDoc(u) {
  if (!u) return null;
  const n = u.name && String(u.name).trim();
  if (n) return n;
  const em = u.email && String(u.email).trim();
  if (em) {
    const at = em.indexOf("@");
    return at > 0 ? em.slice(0, at) : em;
  }
  return null;
}

/**
 * For `contact:<userId>` threads, ensure the member mailbox maps to a display name even when
 * `accounts.mailbox_id` lookup fails (e.g. missing index before migration).
 */
async function enrichAuthorMapFromContactThreadKey(databases, users, authorMap, threadKey, teamMailboxId) {
  const peerUid = peerUserIdFromThreadKey(threadKey || "");
  if (!peerUid) return;
  const peerMb = await ensureMailboxIdForUserId(databases, peerUid);
  const teamMb = String(teamMailboxId || "").trim();
  if (!peerMb || (teamMb && peerMb === teamMb)) return;
  const prev = authorMap.get(peerMb);
  if (prev?.authorDisplayName) return;
  try {
    const u = await users.get(peerUid);
    const dn = displayNameFromUserDoc(u);
    if (dn) {
      authorMap.set(peerMb, { authorUserId: peerUid, authorDisplayName: dn, isTeamAuthor: false });
    }
  } catch (_) {}
}

/** Map mailbox id → { authorUserId, authorDisplayName, isTeamAuthor } */
async function resolveMailboxAuthorsMap(databases, users, mailboxIds, teamMailboxId) {
  const teamMb = String(teamMailboxId || "").trim();
  const uniq = uniqStrings(mailboxIds);
  const map = new Map();
  for (const mb of uniq) {
    if (!mb) continue;
    if (teamMb && mb === teamMb) {
      map.set(mb, { authorUserId: null, authorDisplayName: null, isTeamAuthor: true });
      continue;
    }
    let uid = null;
    try {
      const acc = await databases.listDocuments(DATABASE_ID, ACCOUNTS_COLLECTION, [
        sdk.Query.equal("mailbox_id", mb),
        sdk.Query.limit(1),
      ]);
      uid = acc.documents[0]?.user_id ? String(acc.documents[0].user_id).trim() : null;
    } catch (_) {}
    let dn = null;
    if (uid) {
      try {
        const u = await users.get(uid);
        dn = displayNameFromUserDoc(u);
      } catch (_) {}
    }
    map.set(mb, { authorUserId: uid, authorDisplayName: dn, isTeamAuthor: false });
  }
  return map;
}

async function buildThreadOutWithAuthors(databases, users, conversationId, teamMailboxId, threadKey) {
  const messages = await databases.listDocuments(DATABASE_ID, CONVERSATION_MESSAGES_COLLECTION, [
    sdk.Query.equal("conversation_id", conversationId),
    sdk.Query.orderAsc("$createdAt"),
    sdk.Query.limit(500),
  ]);
  const authorMap = await resolveMailboxAuthorsMap(
    databases,
    users,
    messages.documents.map((m) => m.author_mailbox_id),
    teamMailboxId
  );
  await enrichAuthorMapFromContactThreadKey(databases, users, authorMap, threadKey, teamMailboxId);
  const out = [];
  for (const m of messages.documents) {
    const pl = await databases.listDocuments(DATABASE_ID, PLACEMENTS_COLLECTION, [
      sdk.Query.equal("conversation_message_id", m.$id),
      sdk.Query.limit(100),
    ]);
    const amb = String(m.author_mailbox_id || "");
    const meta = authorMap.get(amb) || { authorUserId: null, authorDisplayName: null, isTeamAuthor: false };
    out.push({
      message: m,
      placements: pl.documents,
      authorUserId: meta.authorUserId,
      authorDisplayName: meta.authorDisplayName,
      isTeamAuthor: meta.isTeamAuthor,
    });
  }
  return out;
}

async function checkAdmin(teams, users, userId) {
  if (!userId) return false;
  try {
    const memberships = await teams.listMemberships("admin");
    if (memberships.memberships.some((m) => m.userId === userId)) return true;
  } catch {}
  try {
    const user = await users.get(userId);
    if (user.labels?.some((l) => String(l).toLowerCase() === "admin" || String(l).toLowerCase() === "administrator"))
      return true;
  } catch {}
  return false;
}

async function ensureUserMailboxId(databases, userId) {
  const res = await databases.listDocuments(DATABASE_ID, ACCOUNTS_COLLECTION, [
    sdk.Query.equal("user_id", userId),
    sdk.Query.limit(1),
  ]);
  if (!res.documents.length) {
    const mid = sdk.ID.unique();
    await databases.createDocument(DATABASE_ID, ACCOUNTS_COLLECTION, sdk.ID.unique(), {
      user_id: userId,
      mailbox_id: mid,
    });
    return mid;
  }
  const doc = res.documents[0];
  if (doc.mailbox_id && String(doc.mailbox_id).trim()) return String(doc.mailbox_id).trim();
  const mid = sdk.ID.unique();
  await databases.updateDocument(DATABASE_ID, ACCOUNTS_COLLECTION, doc.$id, {
    mailbox_id: mid,
  });
  return mid;
}

async function ensureTeamMailboxId(teams, teamId) {
  const prefs = (await teams.getPrefs({ teamId })) || {};
  if (prefs.mailbox_id && String(prefs.mailbox_id).trim()) return String(prefs.mailbox_id).trim();
  const mid = sdk.ID.unique();
  await teams.updatePrefs({
    teamId,
    prefs: { ...prefs, mailbox_id: mid },
  });
  return mid;
}

/** Resolve mailbox for another user by Appwrite user id (accounts.user_id). */
async function ensureMailboxIdForUserId(databases, uid) {
  if (!uid || !String(uid).trim()) return null;
  const res = await databases.listDocuments(DATABASE_ID, ACCOUNTS_COLLECTION, [
    sdk.Query.equal("user_id", String(uid).trim()),
    sdk.Query.limit(1),
  ]);
  if (!res.documents.length) {
    const mid = sdk.ID.unique();
    await databases.createDocument(DATABASE_ID, ACCOUNTS_COLLECTION, sdk.ID.unique(), {
      user_id: String(uid).trim(),
      mailbox_id: mid,
    });
    return mid;
  }
  const doc = res.documents[0];
  if (doc.mailbox_id && String(doc.mailbox_id).trim()) return String(doc.mailbox_id).trim();
  const mid = sdk.ID.unique();
  await databases.updateDocument(DATABASE_ID, ACCOUNTS_COLLECTION, doc.$id, {
    mailbox_id: mid,
  });
  return mid;
}

function peerUserIdFromThreadKey(threadKey) {
  const tk = String(threadKey || "").trim();
  if (!tk.startsWith("contact:")) return null;
  const rest = tk.slice("contact:".length).trim();
  if (!rest.length) return null;
  const parts = rest.split(":");
  const first = parts[0];
  return first && first.length ? first : null;
}

function canAccessConversation(conv, userMailboxId, isAdmin) {
  if (isAdmin) return true;
  const ids = conv.participant_mailbox_ids || [];
  return ids.includes(userMailboxId);
}

/** Appwrite user id of the member in a `contact:<userId>` thread (null if not a contact thread). */
function contactThreadOwnerUserId(conv) {
  return peerUserIdFromThreadKey(conv.thread_key || "");
}

function memberOwnsThisContactThread(conv, userId) {
  const peer = contactThreadOwnerUserId(conv);
  return Boolean(userId && peer && peer === userId);
}

/** True if this mailbox still has any folder row (inbox/sent) for this conversation. */
async function mailboxHasPlacementInConversation(databases, convId, mailboxId) {
  const mb = String(mailboxId || "").trim();
  const cid = String(convId || "").trim();
  if (!mb || !cid) return false;
  const pl = await databases.listDocuments(DATABASE_ID, PLACEMENTS_COLLECTION, [
    sdk.Query.equal("conversation_id", cid),
    sdk.Query.equal("mailbox_id", mb),
    sdk.Query.limit(1),
  ]);
  return pl.documents.length > 0;
}

async function hasAnyPlacementForConversation(databases, convId) {
  const cid = String(convId || "").trim();
  if (!cid) return false;
  const pl = await databases.listDocuments(DATABASE_ID, PLACEMENTS_COLLECTION, [
    sdk.Query.equal("conversation_id", cid),
    sdk.Query.limit(1),
  ]);
  return pl.documents.length > 0;
}

/** Delete all placement rows for a conversation (any mailbox). */
async function deleteAllPlacementsForConversation(databases, convId) {
  const cid = String(convId || "").trim();
  if (!cid) return;
  for (;;) {
    const res = await databases.listDocuments(DATABASE_ID, PLACEMENTS_COLLECTION, [
      sdk.Query.equal("conversation_id", cid),
      sdk.Query.limit(100),
    ]);
    if (!res.documents.length) break;
    for (const pl of res.documents) {
      try {
        await databases.deleteDocument(DATABASE_ID, PLACEMENTS_COLLECTION, pl.$id);
      } catch (_) {}
    }
  }
}

/** Delete all messages for a conversation. */
async function deleteAllMessagesForConversation(databases, convId) {
  const cid = String(convId || "").trim();
  if (!cid) return;
  for (;;) {
    const res = await databases.listDocuments(DATABASE_ID, CONVERSATION_MESSAGES_COLLECTION, [
      sdk.Query.equal("conversation_id", cid),
      sdk.Query.limit(100),
    ]);
    if (!res.documents.length) break;
    for (const msg of res.documents) {
      try {
        await databases.deleteDocument(DATABASE_ID, CONVERSATION_MESSAGES_COLLECTION, msg.$id);
      } catch (_) {}
    }
  }
}

/** Permanently remove conversation and all messages/placements (no participants left). */
async function purgeConversationCompletely(databases, convId) {
  const cid = String(convId || "").trim();
  if (!cid) return;
  await deleteAllPlacementsForConversation(databases, cid);
  await deleteAllMessagesForConversation(databases, cid);
  try {
    await databases.deleteDocument(DATABASE_ID, CONVERSATIONS_COLLECTION, cid);
  } catch (_) {}
}

/**
 * True if the caller may remove this conversation from `targetMailboxId` (only their user mailbox,
 * or team mailbox when admin).
 */
function canRemoveConversationFromMailbox(conv, {
  userId,
  userMailboxId,
  teamMailboxId,
  targetMailboxId,
  isAdmin,
}) {
  const target = String(targetMailboxId || "").trim();
  const umb = String(userMailboxId || "").trim();
  const tmb = String(teamMailboxId || "").trim();
  if (!target) return false;

  if (target === umb) {
    if (canAccessConversation(conv, umb, false)) return true;
    if (memberOwnsThisContactThread(conv, userId)) return true;
    if (isAdmin && canAccessConversation(conv, umb, true)) return true;
    return false;
  }
  if (isAdmin && tmb && target === tmb) return true;
  return false;
}

module.exports = async ({ req, res, log, error }) => {
  if (!hasAppwriteBootstrap()) {
    return fail(res, "Function environment not configured", 500);
  }

  let databases;
  let teams;
  let users;
  try {
    ({ databases, teams, users } = await createServerClientAndDatabases(log, error));
  } catch (e) {
    error(e.message);
    return fail(res, "Could not resolve Appwrite credentials", 500);
  }
  const userId = req.headers["x-appwrite-user-id"] || process.env.APPWRITE_FUNCTION_USER_ID;

  const payload = parsePayload(req);
  const action = payload.action || "getMailboxContext";

  try {
    const isAdmin = await checkAdmin(teams, users, userId);
    const teamId = adminTeamId();

    if (action === "getMailboxContext") {
      if (!userId) return fail(res, "Unauthorized", 401);
      const userMailboxId = await ensureUserMailboxId(databases, userId);
      const teamMailboxId = await ensureTeamMailboxId(teams, teamId);
      const teamDisplayName = await getTeamDisplayName(teams, teamId);
      return ok(res, { success: true, userMailboxId, teamMailboxId, teamDisplayName });
    }

    if (action === "getOrCreateConversation") {
      if (!userId) return fail(res, "Unauthorized", 401);
      const { threadKey, participantMailboxIds, subject, type } = payload;
      if (!threadKey || !String(threadKey).trim()) return fail(res, "Missing threadKey", 400);
      const participants = uniqStrings(participantMailboxIds);
      if (participants.length < 2) return fail(res, "participantMailboxIds must include at least two mailboxes", 400);

      const userMailboxId = await ensureUserMailboxId(databases, userId);
      if (!participants.includes(userMailboxId) && !isAdmin) return fail(res, "Forbidden", 403);

      const existing = await databases.listDocuments(DATABASE_ID, CONVERSATIONS_COLLECTION, [
        sdk.Query.equal("thread_key", String(threadKey).trim()),
        sdk.Query.limit(1),
      ]);
      if (existing.documents.length) {
        return ok(res, { success: true, conversation: existing.documents[0], created: false });
      }

      const conv = await databases.createDocument(DATABASE_ID, CONVERSATIONS_COLLECTION, sdk.ID.unique(), {
        participant_mailbox_ids: participants,
        created_by_mailbox_id: userMailboxId,
        subject: subject && String(subject).trim() ? String(subject).trim() : null,
        type: type && String(type).trim() ? String(type).trim() : null,
        thread_key: String(threadKey).trim(),
        last_message_at: null,
        last_message_preview: null,
        meta: null,
      });
      return ok(res, { success: true, conversation: conv, created: true });
    }

    if (action === "sendMessage") {
      if (!userId) return fail(res, "Unauthorized", 401);
      const {
        conversationId,
        threadKey,
        body,
        subject,
        messageType,
        ticketId: ticketIdPayload,
        recipientMailboxIds,
        siteId,
        priority,
        category,
        targetUserId,
        asTeamMailbox,
      } = payload;
      if (!body || !String(body).trim()) return fail(res, "Missing body", 400);

      const authorMailboxId = await ensureUserMailboxId(databases, userId);
      const teamMailboxId = await ensureTeamMailboxId(teams, teamId);
      const messageAuthorMailboxId =
        isAdmin && asTeamMailbox === true && teamMailboxId ? teamMailboxId : authorMailboxId;

      let conv;
      if (conversationId) {
        conv = await databases.getDocument(DATABASE_ID, CONVERSATIONS_COLLECTION, conversationId);
      } else if (threadKey && String(threadKey).trim()) {
        const found = await databases.listDocuments(DATABASE_ID, CONVERSATIONS_COLLECTION, [
          sdk.Query.equal("thread_key", String(threadKey).trim()),
          sdk.Query.limit(1),
        ]);
        if (!found.documents.length) {
          const peerUid = peerUserIdFromThreadKey(threadKey);
          const peerMb = peerUid ? await ensureMailboxIdForUserId(databases, peerUid) : null;
          const participants = uniqStrings(
            payload.participantMailboxIds || [authorMailboxId, teamMailboxId, ...(peerMb ? [peerMb] : [])]
          );
          if (participants.length < 2) return fail(res, "Create conversation first or pass participantMailboxIds", 400);
          conv = await databases.createDocument(DATABASE_ID, CONVERSATIONS_COLLECTION, sdk.ID.unique(), {
            participant_mailbox_ids: participants,
            created_by_mailbox_id: authorMailboxId,
            subject: subject && String(subject).trim() ? String(subject).trim() : null,
            type: messageType && String(messageType).trim() ? String(messageType).trim() : null,
            thread_key: String(threadKey).trim(),
            last_message_at: null,
            last_message_preview: null,
            meta: null,
          });
        } else {
          conv = found.documents[0];
        }
      } else {
        return fail(res, "conversationId or threadKey required", 400);
      }

      if (!canAccessConversation(conv, authorMailboxId, isAdmin)) {
        if (!isAdmin && memberOwnsThisContactThread(conv, userId)) {
          const merged = uniqStrings([...(conv.participant_mailbox_ids || []), authorMailboxId]);
          await databases.updateDocument(DATABASE_ID, CONVERSATIONS_COLLECTION, conv.$id, {
            participant_mailbox_ids: merged,
          });
          conv = await databases.getDocument(DATABASE_ID, CONVERSATIONS_COLLECTION, conv.$id);
        } else {
          return fail(res, "Forbidden", 403);
        }
      }

      const participants = uniqStrings(conv.participant_mailbox_ids || []);
      let recipients = uniqStrings(recipientMailboxIds);

      if (!isAdmin) {
        // Members always deliver to the admin team mailbox (no recipient selection).
        recipients = [teamMailboxId].filter(
          (id) => id && String(id).trim() && String(id) !== String(messageAuthorMailboxId)
        );
        if (!recipients.length) {
          return fail(res, "Team mailbox not configured", 500);
        }
      } else if (!recipients.length) {
        const tk = conv.thread_key || threadKey || "";
        const peerUid = peerUserIdFromThreadKey(tk);
        const peerMb = peerUid ? await ensureMailboxIdForUserId(databases, peerUid) : null;
        const fromMb = String(messageAuthorMailboxId || "").trim();
        if (peerMb && participants.includes(peerMb) && String(peerMb) !== fromMb) {
          recipients = [peerMb];
        } else {
          recipients = participants.filter((p) => String(p) !== fromMb);
        }
      } else {
        for (const r of recipients) {
          if (!participants.includes(r) && !isAdmin) return fail(res, "Invalid recipient mailbox", 400);
        }
      }
      if (!recipients.length) return fail(res, "No recipients", 400);

      let ticketId = ticketIdPayload && String(ticketIdPayload).trim() ? String(ticketIdPayload).trim() : null;
      const mt = messageType && String(messageType).trim() ? String(messageType).trim() : "contact";

      if (mt === "ticket" && !ticketId) {
        const subj = subject && String(subject).trim() ? String(subject).trim() : null;
        if (!subj) return fail(res, "Subject required for ticket message", 400);
        let ownerId = userId;
        if (targetUserId && String(targetUserId).trim()) {
          if (!isAdmin) return fail(res, "Forbidden", 403);
          ownerId = String(targetUserId).trim();
        }
        const ticket = await databases.createDocument(DATABASE_ID, TICKETS_COLLECTION, sdk.ID.unique(), {
          user_id: ownerId,
          subject: subj,
          status: "open",
          priority: priority || "medium",
          category: category || null,
          site_id: siteId || null,
        });
        ticketId = ticket.$id;
      }

      const preview = String(body).trim().slice(0, 400);
      const nowIso = new Date().toISOString();
      const incomingSubj = subject && String(subject).trim() ? String(subject).trim() : null;

      const msgDoc = await databases.createDocument(
        DATABASE_ID,
        CONVERSATION_MESSAGES_COLLECTION,
        sdk.ID.unique(),
        {
          conversation_id: conv.$id,
          author_mailbox_id: messageAuthorMailboxId,
          body: String(body).trim(),
          message_type: mt,
          ticket_id: ticketId,
        }
      );

      await databases.createDocument(DATABASE_ID, PLACEMENTS_COLLECTION, sdk.ID.unique(), {
        conversation_message_id: msgDoc.$id,
        conversation_id: conv.$id,
        mailbox_id: messageAuthorMailboxId,
        mailbox_folder: FOLDER_SENT,
        read_at: nowIso,
      });

      for (const mb of recipients) {
        await databases.createDocument(DATABASE_ID, PLACEMENTS_COLLECTION, sdk.ID.unique(), {
          conversation_message_id: msgDoc.$id,
          conversation_id: conv.$id,
          mailbox_id: mb,
          mailbox_folder: FOLDER_INBOX,
          read_at: null,
        });
      }

      const mergedParticipants = uniqStrings([
        ...participants,
        ...recipients,
        messageAuthorMailboxId,
        authorMailboxId,
      ]);
      const convPatch = {
        participant_mailbox_ids: mergedParticipants,
        last_message_at: nowIso,
        last_message_preview: preview,
      };
      if (incomingSubj) convPatch.subject = incomingSubj;
      await databases.updateDocument(DATABASE_ID, CONVERSATIONS_COLLECTION, conv.$id, convPatch);

      return ok(res, {
        success: true,
        conversationId: conv.$id,
        message: msgDoc,
        ticketId,
      });
    }

    if (action === "getConversation") {
      if (!userId) return fail(res, "Unauthorized", 401);
      const { conversationId } = payload;
      if (!conversationId) return fail(res, "Missing conversationId", 400);

      const userMailboxId = await ensureUserMailboxId(databases, userId);
      const conv = await databases.getDocument(DATABASE_ID, CONVERSATIONS_COLLECTION, conversationId);
      const canRead =
        canAccessConversation(conv, userMailboxId, isAdmin) ||
        (!isAdmin && memberOwnsThisContactThread(conv, userId));
      if (!canRead) return fail(res, "Forbidden", 403);

      const teamMailboxId = await ensureTeamMailboxId(teams, teamId);
      const out = await buildThreadOutWithAuthors(
        databases,
        users,
        conversationId,
        teamMailboxId,
        conv.thread_key || ""
      );

      const hideClearedMailbox =
        !isAdmin &&
        (canAccessConversation(conv, userMailboxId, false) || memberOwnsThisContactThread(conv, userId)) &&
        !(await mailboxHasPlacementInConversation(databases, conv.$id, userMailboxId));
      return ok(res, {
        success: true,
        conversation: conv,
        thread: hideClearedMailbox ? [] : out,
      });
    }

    if (action === "listConversationsForMailbox") {
      if (!userId) return fail(res, "Unauthorized", 401);
      const { mailboxId, limit } = payload;
      const mb = mailboxId && String(mailboxId).trim() ? String(mailboxId).trim() : await ensureUserMailboxId(databases, userId);
      const lim = Math.min(Number(limit) || 50, 100);
      const userMailboxId = await ensureUserMailboxId(databases, userId);
      if (!isAdmin && mb !== userMailboxId) return fail(res, "Forbidden", 403);

      const fetchCap = Math.min(lim * 5, 200);
      const convs = await databases.listDocuments(DATABASE_ID, CONVERSATIONS_COLLECTION, [
        sdk.Query.contains("participant_mailbox_ids", mb),
        sdk.Query.orderDesc("last_message_at"),
        sdk.Query.limit(fetchCap),
      ]);
      const visible = [];
      for (const conv of convs.documents) {
        if (await mailboxHasPlacementInConversation(databases, conv.$id, mb)) {
          visible.push(conv);
          if (visible.length >= lim) break;
        }
      }
      const teamMailboxIdList = await ensureTeamMailboxId(teams, teamId);
      const teamDisplayName = await getTeamDisplayName(teams, teamId);
      const peerIds = uniqStrings(
        visible.map((c) => peerUserIdFromThreadKey(c.thread_key || "")).filter(Boolean)
      );
      const peerDisplayNames = {};
      for (const pid of peerIds) {
        try {
          const u = await users.get(pid);
          peerDisplayNames[pid] = displayNameFromUserDoc(u) || "";
        } catch (_) {
          peerDisplayNames[pid] = "";
        }
      }

      const authorMbs = [];
      for (const conv of visible) {
        let amb = "";
        try {
          const lastMsgs = await databases.listDocuments(DATABASE_ID, CONVERSATION_MESSAGES_COLLECTION, [
            sdk.Query.equal("conversation_id", conv.$id),
            sdk.Query.orderDesc("$createdAt"),
            sdk.Query.limit(1),
          ]);
          if (lastMsgs.documents[0]) amb = String(lastMsgs.documents[0].author_mailbox_id || "");
        } catch (_) {}
        authorMbs.push(amb);
      }
      const listAuthorMap = await resolveMailboxAuthorsMap(databases, users, authorMbs, teamMailboxIdList);
      const conversationLastAuthorLabels = {};
      for (let i = 0; i < visible.length; i++) {
        const conv = visible[i];
        const amb = authorMbs[i] || "";
        let label = "Member";
        if (teamMailboxIdList && amb === teamMailboxIdList) label = teamDisplayName;
        else {
          const meta = listAuthorMap.get(amb);
          label = (meta?.authorDisplayName && meta.authorDisplayName.trim()) || "Member";
        }
        if (label === "Member") {
          const peerUid = peerUserIdFromThreadKey(conv.thread_key || "");
          const pn = peerUid && peerDisplayNames[peerUid] ? String(peerDisplayNames[peerUid]).trim() : "";
          if (pn) label = pn;
        }
        conversationLastAuthorLabels[conv.$id] = label;
      }

      return ok(res, {
        success: true,
        conversations: visible,
        total: visible.length,
        peerDisplayNames,
        teamDisplayName,
        conversationLastAuthorLabels,
      });
    }

    if (action === "getConversationByThreadKey") {
      if (!userId) return fail(res, "Unauthorized", 401);
      const { threadKey } = payload;
      if (!threadKey || !String(threadKey).trim()) return fail(res, "Missing threadKey", 400);
      const userMailboxId = await ensureUserMailboxId(databases, userId);
      const found = await databases.listDocuments(DATABASE_ID, CONVERSATIONS_COLLECTION, [
        sdk.Query.equal("thread_key", String(threadKey).trim()),
        sdk.Query.limit(1),
      ]);
      if (!found.documents.length) {
        return ok(res, { success: true, conversation: null, thread: [] });
      }
      const conv = found.documents[0];
      const canRead =
        canAccessConversation(conv, userMailboxId, isAdmin) ||
        (!isAdmin && memberOwnsThisContactThread(conv, userId));
      if (!canRead) return fail(res, "Forbidden", 403);
      const conversationId = conv.$id;
      const teamMailboxId = await ensureTeamMailboxId(teams, teamId);
      const out = await buildThreadOutWithAuthors(
        databases,
        users,
        conversationId,
        teamMailboxId,
        conv.thread_key || String(threadKey || "").trim()
      );
      const hideClearedMailbox =
        !isAdmin &&
        (canAccessConversation(conv, userMailboxId, false) || memberOwnsThisContactThread(conv, userId)) &&
        !(await mailboxHasPlacementInConversation(databases, conv.$id, userMailboxId));
      return ok(res, {
        success: true,
        conversation: conv,
        thread: hideClearedMailbox ? [] : out,
      });
    }

    if (action === "listPlacementsForMailboxFolder") {
      if (!userId) return fail(res, "Unauthorized", 401);
      const { mailboxId, folder, limit } = payload;
      const mb = mailboxId && String(mailboxId).trim() ? String(mailboxId).trim() : await ensureUserMailboxId(databases, userId);
      const fd = folder && String(folder).trim() ? String(folder).trim() : FOLDER_INBOX;
      const lim = Math.min(Number(limit) || 100, 200);

      const pl = await databases.listDocuments(DATABASE_ID, PLACEMENTS_COLLECTION, [
        sdk.Query.equal("mailbox_id", mb),
        sdk.Query.equal("mailbox_folder", fd),
        sdk.Query.orderDesc("$createdAt"),
        sdk.Query.limit(lim),
      ]);
      return ok(res, { success: true, placements: pl.documents, total: pl.total });
    }

    if (action === "listThreadsForMailboxFolder") {
      if (!userId) return fail(res, "Unauthorized", 401);
      const { mailboxId, folder, limit } = payload;
      const mb = mailboxId && String(mailboxId).trim() ? String(mailboxId).trim() : await ensureUserMailboxId(databases, userId);
      const fd = folder && String(folder).trim() ? String(folder).trim() : FOLDER_INBOX;
      if (fd !== FOLDER_INBOX && fd !== FOLDER_SENT) return fail(res, "Invalid folder", 400);
      const userMailboxId = await ensureUserMailboxId(databases, userId);
      if (!isAdmin && mb !== userMailboxId) return fail(res, "Forbidden", 403);

      const lim = Math.min(Math.max(Number(limit) || 40, 1), 80);
      const fetchPl = Math.min(300, lim * 10);
      const pl = await databases.listDocuments(DATABASE_ID, PLACEMENTS_COLLECTION, [
        sdk.Query.equal("mailbox_id", mb),
        sdk.Query.equal("mailbox_folder", fd),
        sdk.Query.orderDesc("$createdAt"),
        sdk.Query.limit(fetchPl),
      ]);

      const orderedUnique = [];
      const seen = new Set();
      for (const doc of pl.documents) {
        const cid = doc.conversation_id;
        if (!cid || seen.has(cid)) continue;
        seen.add(cid);
        orderedUnique.push(doc);
        if (orderedUnique.length >= lim) break;
      }

      const teamMailboxIdResolved = await ensureTeamMailboxId(teams, teamId);
      const teamDisplayNameResolved = await getTeamDisplayName(teams, teamId);

      const staged = [];
      for (const p of orderedUnique) {
        try {
          const conv = await databases.getDocument(DATABASE_ID, CONVERSATIONS_COLLECTION, p.conversation_id);
          if (!isAdmin && !canAccessConversation(conv, userMailboxId, false)) continue;
          const msg = await databases.getDocument(
            DATABASE_ID,
            CONVERSATION_MESSAGES_COLLECTION,
            p.conversation_message_id
          );
          const tk = conv.thread_key || "";
          const peerUid = peerUserIdFromThreadKey(tk);
          const body = String(msg.body || "").trim();
          const subj = (conv.subject && String(conv.subject).trim()) || "";
          const title = subj || (body.length > 80 ? `${body.slice(0, 78)}…` : body) || "(No subject)";
          staged.push({ conv, msg, p, tk, peerUid, title });
        } catch (_) {
          continue;
        }
      }

      const authorMap = await resolveMailboxAuthorsMap(
        databases,
        users,
        staged.map((s) => s.msg.author_mailbox_id),
        teamMailboxIdResolved
      );

      const peerUids = uniqStrings(staged.map((s) => s.peerUid).filter(Boolean));
      const peerNames = {};
      for (const pid of peerUids) {
        try {
          const u = await users.get(pid);
          peerNames[pid] = displayNameFromUserDoc(u) || "";
        } catch (_) {
          peerNames[pid] = "";
        }
      }

      const threads = [];
      for (const s of staged) {
        const { msg, conv, p, tk, peerUid, title } = s;
        const body = String(msg.body || "").trim();
        const amb = String(msg.author_mailbox_id || "");
        let lastAuthorLabel = "Member";
        if (teamMailboxIdResolved && amb === teamMailboxIdResolved) {
          lastAuthorLabel = teamDisplayNameResolved;
        } else if (amb === mb) {
          lastAuthorLabel = "You";
        } else {
          const meta = authorMap.get(amb) || { authorDisplayName: null };
          lastAuthorLabel = (meta.authorDisplayName && meta.authorDisplayName.trim()) || "Member";
        }
        if (lastAuthorLabel === "Member" && peerUid) {
          const fallback = peerNames[peerUid] && String(peerNames[peerUid]).trim();
          if (fallback) lastAuthorLabel = fallback;
        }
        const pnm = peerUid ? peerNames[peerUid] : "";
        threads.push({
          conversationId: conv.$id,
          threadKey: tk,
          clientUserId: peerUid,
          clientDisplayName: pnm || null,
          title,
          preview: body.slice(0, 400),
          lastAt: msg.$createdAt || p.$createdAt,
          lastAuthorMailboxId: amb,
          lastAuthorLabel,
          messageType: msg.message_type || "contact",
          ticketId: msg.ticket_id || null,
        });
      }
      return ok(res, { success: true, threads, total: threads.length });
    }

    if (action === "removeConversationFromMailbox") {
      if (!userId) return fail(res, "Unauthorized", 401);
      const { conversationId, threadKey, mailboxId: mailboxIdPayload } = payload;
      let convId = conversationId && String(conversationId).trim() ? String(conversationId).trim() : null;
      if (!convId && threadKey && String(threadKey).trim()) {
        const found = await databases.listDocuments(DATABASE_ID, CONVERSATIONS_COLLECTION, [
          sdk.Query.equal("thread_key", String(threadKey).trim()),
          sdk.Query.limit(1),
        ]);
        if (found.documents.length) convId = found.documents[0].$id;
      }
      if (!convId) return fail(res, "Missing conversationId or threadKey", 400);

      let conv;
      try {
        conv = await databases.getDocument(DATABASE_ID, CONVERSATIONS_COLLECTION, convId);
      } catch (_) {
        return ok(res, { success: true, purged: false, alreadyRemoved: true });
      }

      const userMailboxId = await ensureUserMailboxId(databases, userId);
      const teamMailboxId = await ensureTeamMailboxId(teams, teamId);
      const targetMailboxId =
        mailboxIdPayload && String(mailboxIdPayload).trim()
          ? String(mailboxIdPayload).trim()
          : userMailboxId;

      if (!isAdmin && targetMailboxId !== userMailboxId) return fail(res, "Forbidden", 403);

      const allowed = canRemoveConversationFromMailbox(conv, {
        userId,
        userMailboxId,
        teamMailboxId,
        targetMailboxId,
        isAdmin,
      });
      if (!allowed) return fail(res, "Forbidden", 403);

      const participants = uniqStrings(conv.participant_mailbox_ids || []);
      const inParticipants = participants.includes(targetMailboxId);
      const memberOwns = memberOwnsThisContactThread(conv, userId) && targetMailboxId === userMailboxId;
      const adminClearsTeamMailbox =
        isAdmin && String(targetMailboxId) === String(teamMailboxId || "").trim();
      if (!inParticipants && !memberOwns && !adminClearsTeamMailbox) return fail(res, "Forbidden", 403);

      const msgs = await databases.listDocuments(DATABASE_ID, CONVERSATION_MESSAGES_COLLECTION, [
        sdk.Query.equal("conversation_id", convId),
        sdk.Query.limit(500),
      ]);
      for (const msg of msgs.documents) {
        const pls = await databases.listDocuments(DATABASE_ID, PLACEMENTS_COLLECTION, [
          sdk.Query.equal("conversation_message_id", msg.$id),
          sdk.Query.limit(100),
        ]);
        for (const pl of pls.documents) {
          if (String(pl.mailbox_id || "") !== String(targetMailboxId)) continue;
          try {
            await databases.deleteDocument(DATABASE_ID, PLACEMENTS_COLLECTION, pl.$id);
          } catch (_) {}
        }
      }

      let purged = false;
      if (!(await hasAnyPlacementForConversation(databases, convId))) {
        await purgeConversationCompletely(databases, convId);
        purged = true;
      }

      return ok(res, { success: true, purged });
    }

    return fail(res, "Unknown action: " + action, 400);
  } catch (e) {
    error(e.message);
    return fail(res, e.message || "Internal error", 500);
  }
};
