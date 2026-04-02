import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  ContactThreadData,
  Conversation,
  ConversationThreadRow,
  GetConversationByThreadKeyResponse,
  GetMailboxContextResponse,
  ListConversationsForMailboxResponse,
  MailFolderKind,
  MailboxFolderThreadRow,
  Message,
  MessageType,
} from '../../types';
import {
  ADMIN_TEAM_ID,
  clientUserIdFromThread,
  contactThreadIdForUser,
  newContactThreadKeyForUser,
} from '../../config/contactMessages';
import { executeFunction } from '../../integrations/appwrite/executeFunction';
import { APPWRITE_FUNCTION_IDS } from '../../services/appwrite';
import { useAuth } from '../auth';

const CONVERSATIONS_FN = APPWRITE_FUNCTION_IDS.CONVERSATIONS;

function mapRowToMessage(
  row: ConversationThreadRow,
  opts: {
    threadKey: string;
    userId: string;
    userMailboxId: string;
    teamMailboxId?: string;
    mode: 'member' | 'admin';
    clientUserId?: string | null;
  }
): Message {
  const m = row.message;
  const teamMb = opts.teamMailboxId?.trim();
  const isTeamMessage = Boolean(teamMb && m.author_mailbox_id === teamMb);
  const isMine = !isTeamMessage && m.author_mailbox_id === opts.userMailboxId;
  let sender: string;
  let receiver: string;
  if (opts.mode === 'member') {
    sender = isMine ? opts.userId : ADMIN_TEAM_ID;
    receiver = isMine ? ADMIN_TEAM_ID : opts.userId;
  } else {
    const other = opts.clientUserId ?? '';
    if (isTeamMessage) {
      sender = ADMIN_TEAM_ID;
      receiver = other;
    } else if (isMine) {
      sender = opts.userId;
      receiver = other;
    } else {
      sender = other;
      receiver = opts.userId;
    }
  }
  const mt = m.message_type === 'ticket' || m.message_type === 'contact' ? m.message_type : 'contact';
  const ticketId = m.ticket_id != null && String(m.ticket_id) !== '' ? String(m.ticket_id) : undefined;
  const authorDisplayName =
    row.authorDisplayName != null && String(row.authorDisplayName).trim()
      ? String(row.authorDisplayName).trim()
      : null;
  return {
    $id: m.$id,
    sender,
    receiver,
    thread: opts.threadKey,
    message: m.body,
    type: mt,
    ...(ticketId ? { ticket: ticketId } : {}),
    $createdAt: m.$createdAt,
    $updatedAt: m.$updatedAt,
    authorName: authorDisplayName,
    authorUserId: row.authorUserId ?? null,
    ...(row.isTeamAuthor === true ? { isTeamAuthor: true } : {}),
  };
}

export function useMailboxContext(options?: { enabled?: boolean }) {
  const { user } = useAuth();
  const allow = options?.enabled !== false;
  return useQuery({
    queryKey: ['conversations', 'mailboxContext', user?.$id],
    enabled: Boolean(user && allow),
    staleTime: 60_000,
    queryFn: async () => {
      const res = await executeFunction<GetMailboxContextResponse>(CONVERSATIONS_FN, {
        action: 'getMailboxContext',
      });
      if (!res.success) throw new Error('Mailbox context failed');
      const teamDisplayName =
        res.teamDisplayName != null && String(res.teamDisplayName).trim()
          ? String(res.teamDisplayName).trim()
          : 'Support';
      return { userMailboxId: res.userMailboxId, teamMailboxId: res.teamMailboxId, teamDisplayName };
    },
  });
}

/** All message types in a thread (contact + ticket-linked), plus the `conversations` row (subject lives there). */
export function useContactThreadMessages(threadId: string | null, options?: { enabled?: boolean }) {
  const { user, isAdmin } = useAuth();
  const { data: ctx } = useMailboxContext({ enabled: Boolean(user && threadId && options?.enabled !== false) });
  const allow = options?.enabled !== false;

  return useQuery({
    queryKey: ['conversations', 'thread', threadId, user?.$id, ctx?.userMailboxId, ctx?.teamMailboxId],
    enabled: Boolean(user && threadId && ctx && allow),
    refetchInterval: 60_000,
    queryFn: async (): Promise<ContactThreadData> => {
      const res = await executeFunction<GetConversationByThreadKeyResponse>(CONVERSATIONS_FN, {
        action: 'getConversationByThreadKey',
        threadKey: threadId!,
      });
      if (!res.success) throw new Error('Failed to load conversation');
      if (!res.conversation) {
        return { messages: [], conversation: null };
      }

      const threadKey = res.conversation.thread_key || threadId!;
      const clientId = clientUserIdFromThread(threadKey);
      // Admins viewing another member's thread use admin mapping; own support thread → same as members (you ↔ Support).
      const mode: 'member' | 'admin' =
        !isAdmin || !clientId || clientId === user!.$id ? 'member' : 'admin';

      const messages = res.thread.map((row) =>
        mapRowToMessage(row, {
          threadKey,
          userId: user!.$id,
          userMailboxId: ctx!.userMailboxId,
          teamMailboxId: ctx!.teamMailboxId,
          mode,
          clientUserId: clientId,
        })
      );
      return { messages, conversation: res.conversation };
    },
  });
}

export interface AdminInboxThread {
  /** Appwrite `conversations` document id (for remove-from-mailbox, etc.) */
  conversationId: string;
  threadId: string;
  clientUserId: string;
  /** From `conversations.subject` (not per message). */
  conversationSubject?: string | null;
  /** Appwrite user name for the contact thread owner, when available. */
  clientDisplayName?: string | null;
  /** Label for the latest message author (member name, team name, etc.). */
  lastAuthorLabel?: string | null;
  lastMessage: Message;
  messages: Message[];
}

/** Result of {@link useAdminContactInboxThreads} (team mailbox conversation list). */
export interface AdminContactInboxData {
  threads: AdminInboxThread[];
  /** Total matching conversations (Appwrite list total). */
  total: number;
}

function conversationToTeaserMessage(conv: Conversation, clientUserId: string): Message {
  const preview = conv.last_message_preview?.trim() || '';
  const at = conv.last_message_at || conv.$updatedAt;
  return {
    $id: conv.$id,
    sender: ADMIN_TEAM_ID,
    receiver: clientUserId,
    thread: conv.thread_key,
    message: preview,
    type: 'contact',
    $createdAt: at,
    $updatedAt: conv.$updatedAt,
  };
}

export function useAdminContactInboxThreads(options?: { enabled?: boolean; limit?: number }) {
  const { user, isAdmin } = useAuth();
  const { data: ctx } = useMailboxContext({ enabled: Boolean(user && isAdmin && options?.enabled !== false) });
  const allow = options?.enabled !== false;
  const limit = Math.min(Math.max(Number(options?.limit) || 100, 1), 100);

  return useQuery({
    queryKey: ['conversations', 'adminInbox', user?.$id, ctx?.teamMailboxId, limit],
    enabled: Boolean(user && isAdmin && ctx && allow),
    refetchInterval: 60_000,
    queryFn: async () => {
      const res = await executeFunction<ListConversationsForMailboxResponse>(CONVERSATIONS_FN, {
        action: 'listConversationsForMailbox',
        mailboxId: ctx!.teamMailboxId,
        limit,
      });
      if (!res.success) throw new Error('Failed to list conversations');
      const peerNames = res.peerDisplayNames ?? {};
      const authorLabels = res.conversationLastAuthorLabels ?? {};
      const threads: AdminInboxThread[] = [];
      for (const conv of res.conversations) {
        const tk = conv.thread_key || '';
        const clientUserId = clientUserIdFromThread(tk);
        if (!clientUserId) continue;
        const cs = conv.subject != null && String(conv.subject).trim() ? String(conv.subject).trim() : null;
        const pnm = peerNames[clientUserId];
        const clientDisplayName = pnm != null && String(pnm).trim() ? String(pnm).trim() : null;
        const lastAuthorLabel =
          authorLabels[conv.$id] != null && String(authorLabels[conv.$id]).trim()
            ? String(authorLabels[conv.$id]).trim()
            : null;
        threads.push({
          conversationId: conv.$id,
          threadId: tk,
          clientUserId,
          conversationSubject: cs,
          clientDisplayName,
          lastAuthorLabel,
          lastMessage: conversationToTeaserMessage(conv, clientUserId),
          messages: [],
        });
      }
      threads.sort(
        (a, b) =>
          new Date(b.lastMessage.$createdAt).getTime() - new Date(a.lastMessage.$createdAt).getTime()
      );
      const total = typeof res.total === 'number' ? res.total : threads.length;
      return { threads, total } satisfies AdminContactInboxData;
    },
  });
}

export interface SendMessageVars {
  text: string;
  subject?: string;
  messageType: MessageType;
  siteId?: string;
  threadId?: string;
  targetUserId?: string;
  /**
   * Admin only: when true, the message is authored by the team mailbox (Support). Omit or false when
   * the admin is writing from their personal mailbox (e.g. Support mailbox UI as a user).
   */
  asTeamMailbox?: boolean;
  /**
   * When true, never use `threadId` to pick the thread (avoids stale selection during Compose).
   * Reply flows should omit this or set false.
   */
  compose?: boolean;
}

/** @deprecated use SendMessageVars */
export type SendContactMessageVars = SendMessageVars;

export interface ListThreadsForMailboxFolderResponse {
  success: boolean;
  threads: MailboxFolderThreadRow[];
  total: number;
}

async function fetchFolderThreads(mailboxId: string, folder: MailFolderKind, limit: number) {
  const res = await executeFunction<ListThreadsForMailboxFolderResponse>(CONVERSATIONS_FN, {
    action: 'listThreadsForMailboxFolder',
    mailboxId,
    folder,
    limit,
  });
  if (!res.success) throw new Error('Failed to load mailbox threads');
  return { threads: res.threads, total: res.total };
}

/** Admin team mailbox: threads appearing in a folder (inbox / sent). */
export function useTeamMailboxFolderThreads(folder: MailFolderKind, options?: { enabled?: boolean; limit?: number }) {
  const { user, isAdmin } = useAuth();
  const { data: ctx } = useMailboxContext({
    enabled: Boolean(user && isAdmin && options?.enabled !== false),
  });
  const limit = Math.min(Math.max(options?.limit ?? 50, 1), 80);
  return useQuery({
    queryKey: ['conversations', 'teamFolderThreads', folder, ctx?.teamMailboxId, limit],
    enabled: Boolean(user && isAdmin && ctx?.teamMailboxId && options?.enabled !== false),
    refetchInterval: 60_000,
    queryFn: () => fetchFolderThreads(ctx!.teamMailboxId, folder, limit),
  });
}

/** Member mailbox: threads in inbox / sent for the signed-in user’s mailbox. */
export function useMemberMailboxFolderThreads(folder: MailFolderKind, options?: { enabled?: boolean; limit?: number }) {
  const { user } = useAuth();
  const { data: ctx } = useMailboxContext({
    enabled: Boolean(user && options?.enabled !== false),
  });
  const limit = Math.min(Math.max(options?.limit ?? 50, 1), 80);
  return useQuery({
    queryKey: ['conversations', 'memberFolderThreads', folder, ctx?.userMailboxId, limit],
    enabled: Boolean(user && ctx?.userMailboxId && options?.enabled !== false),
    refetchInterval: 60_000,
    queryFn: () => fetchFolderThreads(ctx!.userMailboxId, folder, limit),
  });
}

/**
 * Removes inbox/sent placements for one mailbox only. Other participants keep the thread until they
 * remove it; when no placements remain, the server deletes the conversation permanently.
 * Pass `mailboxId` (e.g. team mailbox) when an admin clears the team mailbox view.
 */
export function useRemoveConversationFromMailboxMutation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (params: { conversationId?: string; threadKey?: string; mailboxId?: string }) => {
      if (!user) throw new Error('Not signed in');
      await executeFunction(CONVERSATIONS_FN, { action: 'removeConversationFromMailbox', ...params });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

export function useSendContactMessage() {
  const queryClient = useQueryClient();
  const { user, isAdmin } = useAuth();

  return useMutation({
    mutationFn: async (vars: SendMessageVars) => {
      if (!user) throw new Error('Not signed in');
      const text = vars.text.trim();
      if (!text) throw new Error('Message is empty');

      const subj = vars.subject?.trim() ?? '';
      if (vars.messageType === 'ticket' && !subj) {
        throw new Error('Subject is required for a ticket message');
      }

      if (!isAdmin) {
        const ownTk = contactThreadIdForUser(user.$id);
        const explicit = vars.compose === true ? undefined : vars.threadId?.trim();
        let threadKey: string;
        if (vars.compose === true) {
          threadKey = newContactThreadKeyForUser(user.$id);
        } else if (explicit && clientUserIdFromThread(explicit) === user.$id) {
          threadKey = explicit;
        } else {
          threadKey = ownTk;
        }
        const sent = await executeFunction<{ success?: boolean; ticketId?: string }>(CONVERSATIONS_FN, {
          action: 'sendMessage',
          threadKey,
          body: text,
          subject: subj || undefined,
          messageType: vars.messageType,
          siteId: vars.siteId || undefined,
        });
        return { thread: threadKey, ...(sent.ticketId ? { ticketId: sent.ticketId } : {}) };
      }

      const tid = vars.compose === true ? undefined : vars.threadId?.trim();
      const tuid = vars.targetUserId?.trim();
      let threadKey: string;
      let ticketTargetUserId: string | undefined;

      if (tuid) {
        if (tuid === user.$id) throw new Error('Cannot message yourself');
        threadKey =
          vars.compose === true ? newContactThreadKeyForUser(tuid) : contactThreadIdForUser(tuid);
        if (vars.messageType === 'ticket') ticketTargetUserId = tuid;
      } else if (tid) {
        const clientId = clientUserIdFromThread(tid);
        if (!clientId) throw new Error('Invalid conversation thread');
        threadKey = tid;
        if (clientId !== user.$id && vars.messageType === 'ticket') {
          ticketTargetUserId = clientId;
        }
      } else {
        // Admin messaging the team from own mailbox (compose → new thread; legacy default key otherwise)
        threadKey =
          vars.compose === true ? newContactThreadKeyForUser(user.$id) : contactThreadIdForUser(user.$id);
      }

      const sent = await executeFunction<{ success?: boolean; ticketId?: string }>(CONVERSATIONS_FN, {
        action: 'sendMessage',
        threadKey,
        body: text,
        subject: subj || undefined,
        messageType: vars.messageType,
        siteId: vars.siteId || undefined,
        ...(ticketTargetUserId ? { targetUserId: ticketTargetUserId } : {}),
        ...(vars.asTeamMailbox ? { asTeamMailbox: true } : {}),
      });
      return { thread: threadKey, ...(sent.ticketId ? { ticketId: sent.ticketId } : {}) };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['adminTickets'] });
    },
  });
}
