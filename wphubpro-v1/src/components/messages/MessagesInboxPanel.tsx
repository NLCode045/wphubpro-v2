/**
 * Shared messages UI: user Inbox (thread with team) vs Admin inbox (all member threads).
 * Use `inboxMode` on dedicated routes: `/messages` → member, `/admin/messages` → admin.
 */
import React, { useMemo, useState } from 'react';
import Autocomplete from '@mui/material/Autocomplete';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormLabel from '@mui/material/FormLabel';
import Icon from '@mui/material/Icon';
import Link from '@mui/material/Link';
import ListItemButton from '@mui/material/ListItemButton';
import MenuItem from '@mui/material/MenuItem';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import SoftBox from 'components/SoftBox';
import SoftButton from 'components/SoftButton';
import SoftInput from 'components/SoftInput';
import SoftTypography from 'components/SoftTypography';
import { Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../../domains/auth';
import { useAdminUsersQuickSearch, type AdminUser } from '../../domains/admin/useAdminUsers';
import {
  useAdminContactInboxThreads,
  useContactThreadMessages,
  useMailboxContext,
  useRemoveConversationFromMailboxMutation,
  useSendContactMessage,
} from '../../domains/messages/hooks';
import { accountDisplayLabel, messageSenderLabel } from '../../domains/messages/messageLabels';
import { ADMIN_TEAM_ID, contactThreadIdForUser } from '../../config/contactMessages';
import { useToast } from '../../contexts/ToastContext';
import { ROUTE_PATHS } from '../../config/routePaths';
import { useSites } from '../../domains/sites';
import type { Message, MessageType } from '../../types';

const TAB_INBOX = 0;
const TAB_FORM = 1;

/** Member mailbox (Support hub): Inbox / Outbox on the same thread */
const MEMBER_MAIL_INBOX = 0;
const MEMBER_MAIL_OUTBOX = 1;

/** Admin thread sub-folders: All / from user / my replies */
const ADMIN_THREAD_ALL = 0;
const ADMIN_THREAD_INBOX = 1;
const ADMIN_THREAD_OUTBOX = 2;

const messageBoxTabsSx = {
  minHeight: 36,
  mb: 1,
  minWidth: 0,
  '& .MuiTab-root': {
    minHeight: 36,
    py: 0.75,
    px: 1.5,
    textTransform: 'none' as const,
    fontWeight: 600,
    fontSize: '0.8125rem',
  },
  '& .MuiTabs-indicator': {
    height: 2,
    borderRadius: '2px 2px 0 0',
    backgroundColor: 'primary.main',
  },
};

const folderTabsSx = {
  minHeight: 32,
  mb: 1,
  '& .MuiTab-root': {
    minHeight: 32,
    py: 0.5,
    px: 1,
    textTransform: 'none' as const,
    fontWeight: 600,
    fontSize: '0.75rem',
  },
  '& .MuiTabs-indicator': { height: 2 },
};

function MessageBubbleRow({
  m,
  viewerId,
  teamLabel,
  clientUserId,
  outboundSenderIds,
  viewerDisplayName,
  peerDisplayName,
}: {
  m: Message;
  viewerId: string;
  /** Appwrite admin team name or "Support" */
  teamLabel: string;
  /** Peer member user id (admin viewing their thread). */
  clientUserId?: string | null;
  /** Admin thread: treat these as the support side (outgoing), including team mailbox id. */
  outboundSenderIds?: string[];
  viewerDisplayName?: string | null;
  peerDisplayName?: string | null;
}) {
  const bubbleLabel = messageSenderLabel({
    m,
    viewerId,
    teamLabel,
    clientUserId: clientUserId ?? undefined,
    outboundSenderIds,
    viewerDisplayName,
    peerDisplayName,
  });
  const mine =
    outboundSenderIds && outboundSenderIds.length > 0
      ? outboundSenderIds.includes(m.sender)
      : m.sender === viewerId;
  return (
    <SoftBox
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: mine ? 'flex-end' : 'flex-start',
        mb: 1,
        maxWidth: '100%',
      }}
    >
      <SoftBox display="flex" alignItems="center" gap={0.5} sx={{ px: 0.5, mb: 0.25 }} flexWrap="wrap">
        <SoftTypography variant="caption" color="secondary">
          {bubbleLabel}
        </SoftTypography>
        {m.type === 'ticket' && (
          <Chip size="small" label="Ticket" color="warning" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
        )}
      </SoftBox>
      <SoftBox
        sx={{
          px: 1.25,
          py: 0.75,
          borderRadius: 1.5,
          maxWidth: '100%',
          bgcolor: mine ? 'primary.main' : 'action.hover',
          color: mine ? 'primary.contrastText' : 'text.primary',
        }}
      >
        <SoftTypography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {m.message}
        </SoftTypography>
      </SoftBox>
      {m.type === 'ticket' && m.ticket && (
        <Link
          component={RouterLink}
          to={ROUTE_PATHS.TICKET_DETAIL.replace(':id', m.ticket)}
          variant="caption"
          sx={{ mt: 0.25, px: 0.5, fontSize: '0.7rem' }}
        >
          Open helpdesk ticket
        </Link>
      )}
      <SoftTypography variant="caption" color="secondary" sx={{ px: 0.5, mt: 0.25 }}>
        {new Date(m.$createdAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
      </SoftTypography>
    </SoftBox>
  );
}

function MessageTypeFields({
  messageType,
  onMessageType,
  subject,
  onSubject,
  siteId,
  onSiteId,
  enabledSites,
  sitesLoading,
  showSite,
}: {
  messageType: MessageType;
  onMessageType: (t: MessageType) => void;
  subject: string;
  onSubject: (v: string) => void;
  siteId: string;
  onSiteId: (v: string) => void;
  enabledSites: { $id: string; siteName?: string; siteUrl?: string }[];
  sitesLoading: boolean;
  showSite: boolean;
}) {
  return (
    <>
      <FormControl component="fieldset" size="small" sx={{ width: '100%' }}>
        <FormLabel component="legend" sx={{ fontSize: '0.7rem', mb: 0.5, fontWeight: 600, color: 'text.primary' }}>
          Message type
        </FormLabel>
        <RadioGroup
          row
          value={messageType}
          onChange={(e) => onMessageType(e.target.value as MessageType)}
          sx={{ gap: 1 }}
        >
          <FormControlLabel
            value="contact"
            control={<Radio size="small" />}
            label={<SoftTypography variant="caption">Contact</SoftTypography>}
          />
          <FormControlLabel
            value="ticket"
            control={<Radio size="small" />}
            label={<SoftTypography variant="caption">Ticket</SoftTypography>}
          />
        </RadioGroup>
        <SoftTypography variant="caption" color="secondary" display="block" sx={{ mt: 0.5 }}>
          <strong>Contact</strong> is a regular message to the team inbox (all admins can read).{' '}
          <strong>Ticket</strong> creates a helpdesk ticket and links it here.
        </SoftTypography>
      </FormControl>

      <SoftBox>
        <SoftTypography
          variant="caption"
          fontWeight="medium"
          color="text"
          display="block"
          mb={0.5}
          sx={{ fontSize: '0.7rem', lineHeight: 1.3 }}
        >
          Subject {messageType === 'ticket' ? '(required)' : '(optional)'}
        </SoftTypography>
        <SoftInput
          value={subject}
          onChange={(e) => onSubject(e.target.value)}
          fullWidth
          size="small"
          placeholder={messageType === 'ticket' ? 'Ticket title' : 'Topic (optional)'}
        />
      </SoftBox>

      {showSite && (
        <SoftBox>
          <SoftTypography
            variant="caption"
            fontWeight="medium"
            color="text"
            display="block"
            mb={0.5}
            sx={{ fontSize: '0.7rem', lineHeight: 1.3 }}
          >
            Site
          </SoftTypography>
          <TextField
            select
            value={siteId}
            onChange={(e) => onSiteId(e.target.value)}
            fullWidth
            size="small"
            variant="outlined"
            hiddenLabel
            disabled={sitesLoading}
            SelectProps={{ displayEmpty: true }}
            helperText={messageType === 'ticket' ? 'Optional — link ticket to a site' : undefined}
            FormHelperTextProps={{ sx: { fontSize: '0.7rem', mt: 0.5, mx: 0 } }}
            sx={{
              '& .MuiOutlinedInput-root': { fontSize: '0.875rem', borderRadius: 1 },
              '& .MuiOutlinedInput-input': { py: 1 },
            }}
          >
            <MenuItem value="">
              <em>None</em>
            </MenuItem>
            {enabledSites.map((s) => (
              <MenuItem key={s.$id} value={s.$id}>
                {s.siteName || s.siteUrl}
              </MenuItem>
            ))}
          </TextField>
        </SoftBox>
      )}
    </>
  );
}

export type MessagesInboxPanelProps = {
  /** Dashboard card vs full page */
  variant?: 'compact' | 'full';
  /**
   * `auto`: admin users see admin inbox on dashboard (legacy).
   * `member`: always user inbox (team thread only) — use on `/messages`.
   * `admin`: team inbox — use on `/admin/messages`; non-admins see nothing.
   */
  inboxMode?: 'auto' | 'member' | 'admin';
  /** Member: Inbox / Outbox tabs on the mailbox list (same thread; Support hub). */
  enableMemberMailFolders?: boolean;
  /** Admin: filter thread messages by all / from user / my replies (Support dashboard). */
  enableAdminThreadMailFolders?: boolean;
};

export const MessagesInboxPanel: React.FC<MessagesInboxPanelProps> = ({
  variant = 'compact',
  inboxMode = 'auto',
  enableMemberMailFolders = false,
  enableAdminThreadMailFolders = false,
}) => {
  const { toast } = useToast();
  const { user, isAdmin } = useAuth();
  const sendMessage = useSendContactMessage();
  const removeFromMailbox = useRemoveConversationFromMailboxMutation();
  const { data: mailboxCtx } = useMailboxContext({ enabled: !!user });
  const { data: sites, isLoading: sitesLoading } = useSites();
  const teamDisplayName = mailboxCtx?.teamDisplayName ?? 'Support';
  const viewerDisplayName = useMemo(() => accountDisplayLabel(user), [user]);

  const showAdminUi =
    inboxMode === 'admin' || (inboxMode === 'auto' && isAdmin);
  const showMemberUi =
    inboxMode === 'member' || (inboxMode === 'auto' && !isAdmin);

  const threadListMaxH = variant === 'full' ? 320 : 160;
  const messageListMaxH = variant === 'full' ? 420 : 200;

  const [tab, setTab] = useState(TAB_INBOX);
  const [body, setBody] = useState('');
  const [subject, setSubject] = useState('');
  const [messageType, setMessageType] = useState<MessageType>('contact');
  const [siteId, setSiteId] = useState('');
  const [adminReceiverQuery, setAdminReceiverQuery] = useState('');
  const [adminReceiver, setAdminReceiver] = useState<AdminUser | null>(null);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [memberMailFolder, setMemberMailFolder] = useState(MEMBER_MAIL_INBOX);
  const [adminThreadFolder, setAdminThreadFolder] = useState(ADMIN_THREAD_ALL);
  const [removeMemberMailboxOpen, setRemoveMemberMailboxOpen] = useState(false);

  const enabledSites = useMemo(
    () => (sites ?? []).filter((s) => s.enabled !== false),
    [sites]
  );

  const memberThreadId = user && showMemberUi ? contactThreadIdForUser(user.$id) : null;
  const { data: memberThreadData, isLoading: memberLoading } = useContactThreadMessages(memberThreadId, {
    enabled: showMemberUi,
  });
  const memberMessages = memberThreadData?.messages ?? [];
  const memberConversation = memberThreadData?.conversation ?? null;

  const { data: adminInboxData, isLoading: adminThreadsLoading } = useAdminContactInboxThreads({
    enabled: showAdminUi,
  });
  const adminThreads = adminInboxData?.threads ?? [];

  const selectedAdminThread = useMemo(
    () => adminThreads.find((t) => t.threadId === selectedThreadId) ?? null,
    [adminThreads, selectedThreadId]
  );

  const { data: adminThreadData, isLoading: adminThreadLiveLoading } = useContactThreadMessages(
    showAdminUi ? selectedThreadId : null,
    { enabled: showAdminUi && !!selectedThreadId }
  );
  const adminThreadConversation = adminThreadData?.conversation ?? null;
  const adminMessagesToShow = showAdminUi && selectedThreadId ? (adminThreadData?.messages ?? []) : [];

  const filteredMemberMessages = useMemo(() => {
    if (!user || !enableMemberMailFolders) return memberMessages;
    if (memberMailFolder === MEMBER_MAIL_INBOX) return memberMessages.filter((m) => m.sender !== user.$id);
    if (memberMailFolder === MEMBER_MAIL_OUTBOX) return memberMessages.filter((m) => m.sender === user.$id);
    return memberMessages;
  }, [memberMessages, memberMailFolder, enableMemberMailFolders, user]);

  const filteredAdminThreadMessages = useMemo(() => {
    if (!user || !enableAdminThreadMailFolders) return adminMessagesToShow;
    const cid = selectedAdminThread?.clientUserId;
    if (!cid) return adminMessagesToShow;
    if (adminThreadFolder === ADMIN_THREAD_INBOX) return adminMessagesToShow.filter((m) => m.sender === cid);
    if (adminThreadFolder === ADMIN_THREAD_OUTBOX) return adminMessagesToShow.filter((m) => m.sender !== cid);
    return adminMessagesToShow;
  }, [adminMessagesToShow, adminThreadFolder, enableAdminThreadMailFolders, user, selectedAdminThread?.clientUserId]);

  const { data: adminSearchUsers = [], isFetching: adminSearchLoading } = useAdminUsersQuickSearch(
    adminReceiverQuery,
    isAdmin && (showAdminUi || (showMemberUi && tab === TAB_FORM))
  );

  const validateSend = (): boolean => {
    if (messageType === 'ticket' && !subject.trim()) {
      toast({ title: 'Subject is required for a ticket message', variant: 'destructive' });
      return false;
    }
    if (!body.trim()) {
      toast({ title: 'Enter a message', variant: 'destructive' });
      return false;
    }
    return true;
  };

  const handleSendMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateSend()) return;
    try {
      await sendMessage.mutateAsync({
        text: body.trim(),
        subject: subject.trim() || undefined,
        messageType,
        siteId: siteId || undefined,
        compose: true,
        ...(isAdmin && adminReceiver ? { targetUserId: adminReceiver.id } : {}),
      });
      toast({ title: messageType === 'ticket' ? 'Ticket created' : 'Message sent', variant: 'success' });
      setBody('');
      setSubject('');
      setSiteId('');
      setMessageType('contact');
      setAdminReceiver(null);
      setAdminReceiverQuery('');
    } catch (err) {
      toast({
        title: 'Could not send',
        description: err instanceof Error ? err.message : 'Try again later.',
        variant: 'destructive',
      });
    }
  };

  const handleSendAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateSend()) return;
    try {
      if (tab === TAB_INBOX && selectedThreadId) {
        await sendMessage.mutateAsync({
          text: body.trim(),
          subject: subject.trim() || undefined,
          messageType,
          siteId: siteId || undefined,
          threadId: selectedThreadId,
          asTeamMailbox: true,
        });
      } else {
        const target = adminReceiver?.id;
        if (!target) {
          toast({ title: 'Choose a member to message', variant: 'destructive' });
          return;
        }
        await sendMessage.mutateAsync({
          text: body.trim(),
          subject: subject.trim() || undefined,
          messageType,
          siteId: siteId || undefined,
          targetUserId: target,
          asTeamMailbox: true,
          compose: true,
        });
      }
      toast({ title: messageType === 'ticket' ? 'Ticket created' : 'Message sent', variant: 'success' });
      setBody('');
      setSubject('');
      setSiteId('');
      setMessageType('contact');
      if (tab === TAB_FORM) {
        setAdminReceiver(null);
        setAdminReceiverQuery('');
      }
    } catch (err) {
      toast({
        title: 'Could not send',
        description: err instanceof Error ? err.message : 'Try again later.',
        variant: 'destructive',
      });
    }
  };

  const confirmRemoveMemberMailbox = async () => {
    if (!user || !memberThreadId) return;
    try {
      await removeFromMailbox.mutateAsync({ threadKey: memberThreadId });
      toast({
        title: 'Removed from your mailbox',
        description: 'Your folders are cleared; the team still has the full thread. Send a new message anytime to continue.',
        variant: 'success',
      });
      setRemoveMemberMailboxOpen(false);
    } catch (err) {
      toast({
        title: 'Could not remove',
        description: err instanceof Error ? err.message : 'Try again later.',
        variant: 'destructive',
      });
    }
  };

  if (!user) {
    return (
      <SoftBox py={2}>
        <SoftTypography variant="body2" color="secondary">
          Sign in to view messages.
        </SoftTypography>
      </SoftBox>
    );
  }

  if (inboxMode === 'admin' && !isAdmin) {
    return (
      <SoftBox py={2}>
        <SoftTypography variant="body2" color="secondary">
          Admin inbox is only available to team members.
        </SoftTypography>
      </SoftBox>
    );
  }

  const inboxTitle = showAdminUi ? 'Admin inbox' : 'Inbox';
  const inboxSubtitle = showAdminUi
    ? 'Team view: every member’s contact thread. Pick someone to read and reply, or send a new message from the Send tab.'
    : 'Your conversation with the team — new replies appear below.';

  return (
    <SoftBox>
      <Dialog open={removeMemberMailboxOpen} onClose={() => setRemoveMemberMailboxOpen(false)}>
        <DialogTitle>Remove from your mailbox?</DialogTitle>
        <DialogContent>
          <SoftTypography variant="body2" color="secondary">
            This only removes the thread from your folders. The conversation stays for the team and other participants. You can
            message them again whenever you like.
          </SoftTypography>
        </DialogContent>
        <DialogActions>
          <SoftButton variant="outlined" color="secondary" onClick={() => setRemoveMemberMailboxOpen(false)}>
            Cancel
          </SoftButton>
          <SoftButton
            color="error"
            variant="gradient"
            onClick={confirmRemoveMemberMailbox}
            disabled={removeFromMailbox.isPending}
          >
            {removeFromMailbox.isPending ? 'Removing…' : 'Remove'}
          </SoftButton>
        </DialogActions>
      </Dialog>

      <SoftBox display="flex" alignItems="center" gap={1} mb={0.5}>
        <Icon sx={{ color: 'info.main', fontSize: 22 }}>inbox</Icon>
        <SoftTypography variant="button" fontWeight="bold" color="text">
          {inboxTitle}
        </SoftTypography>
      </SoftBox>
      <SoftTypography variant="caption" color="secondary" display="block" mb={1}>
        {inboxSubtitle}
      </SoftTypography>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth" sx={messageBoxTabsSx}>
        <Tab label="Inbox" icon={<Icon sx={{ fontSize: 18 }}>inbox</Icon>} iconPosition="start" />
        <Tab label="Send message" icon={<Icon sx={{ fontSize: 18 }}>edit_note</Icon>} iconPosition="start" />
      </Tabs>

      {tab === TAB_INBOX && showMemberUi && (
        <>
          {enableMemberMailFolders && (
            <Tabs
              value={memberMailFolder}
              onChange={(_, v) => setMemberMailFolder(v)}
              variant="fullWidth"
              sx={folderTabsSx}
            >
              <Tab label="Inbox" icon={<Icon sx={{ fontSize: 16 }}>inbox</Icon>} iconPosition="start" />
              <Tab label="Outbox" icon={<Icon sx={{ fontSize: 16 }}>send</Icon>} iconPosition="start" />
            </Tabs>
          )}
          {memberLoading ? (
            <SoftBox display="flex" justifyContent="center" py={2}>
              <CircularProgress size={22} />
            </SoftBox>
          ) : memberMessages.length === 0 ? (
            <SoftTypography variant="body2" color="secondary" sx={{ mb: 1 }}>
              No messages yet. Use “Send message” to reach the team.
            </SoftTypography>
          ) : filteredMemberMessages.length === 0 ? (
            <SoftTypography variant="body2" color="secondary" sx={{ mb: 1 }}>
              No messages in this folder.
            </SoftTypography>
          ) : (
            <SoftBox
              sx={{
                maxHeight: messageListMaxH,
                overflow: 'auto',
                pr: 0.5,
                mb: 1,
              }}
            >
              {memberConversation?.subject != null && String(memberConversation.subject).trim() !== '' ? (
                <SoftTypography variant="subtitle2" fontWeight="bold" display="block" sx={{ mb: 1 }}>
                  {String(memberConversation.subject).trim()}
                </SoftTypography>
              ) : null}
              {filteredMemberMessages.map((m) => (
                <MessageBubbleRow
                  key={m.$id}
                  m={m}
                  viewerId={user.$id}
                  teamLabel={teamDisplayName}
                  viewerDisplayName={viewerDisplayName}
                />
              ))}
            </SoftBox>
          )}
          {memberThreadId ? (
            <SoftBox mt={1}>
              <SoftButton
                size="small"
                variant="text"
                color="secondary"
                startIcon={<Icon sx={{ fontSize: 18 }}>visibility_off</Icon>}
                onClick={() => setRemoveMemberMailboxOpen(true)}
              >
                Remove conversation from your mailbox
              </SoftButton>
            </SoftBox>
          ) : null}
        </>
      )}

      {tab === TAB_INBOX && showAdminUi && (
        <>
          {adminThreadsLoading ? (
            <SoftBox display="flex" justifyContent="center" py={2}>
              <CircularProgress size={22} />
            </SoftBox>
          ) : adminThreads.length === 0 ? (
            <SoftTypography variant="body2" color="secondary" sx={{ mb: 1 }}>
              No conversations yet. Use “Send message” to contact a member.
            </SoftTypography>
          ) : (
            <>
              <SoftTypography variant="caption" color="secondary" display="block" mb={0.5}>
                Conversations
              </SoftTypography>
              <SoftBox
                sx={{
                  maxHeight: threadListMaxH,
                  overflow: 'auto',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  mb: 1,
                }}
              >
                {adminThreads.map((t) => (
                  <ListItemButton
                    key={t.threadId}
                    selected={selectedThreadId === t.threadId}
                    onClick={() => setSelectedThreadId(t.threadId)}
                    sx={{ alignItems: 'flex-start', py: 1 }}
                  >
                    <SoftBox flex={1} minWidth={0}>
                      <SoftTypography variant="button" fontWeight="bold" noWrap display="block">
                        {t.clientDisplayName?.trim() || 'Member'}
                      </SoftTypography>
                      <SoftTypography variant="caption" color="secondary" noWrap display="block">
                        {t.conversationSubject ? `${t.conversationSubject} — ` : ''}
                        {t.lastMessage.message}
                      </SoftTypography>
                    </SoftBox>
                  </ListItemButton>
                ))}
              </SoftBox>

              {adminThreads.length > 0 && !selectedThreadId && (
                <SoftTypography variant="caption" color="secondary" display="block" sx={{ mb: 1 }}>
                  Select a conversation to read and reply.
                </SoftTypography>
              )}

              {selectedThreadId && (
                <>
                  <SoftTypography variant="caption" color="secondary" display="block" mb={0.5}>
                    Thread
                  </SoftTypography>
                  {adminThreadConversation?.subject != null && String(adminThreadConversation.subject).trim() !== '' ? (
                    <SoftTypography variant="subtitle2" fontWeight="bold" display="block" sx={{ mb: 1 }}>
                      {String(adminThreadConversation.subject).trim()}
                    </SoftTypography>
                  ) : null}
                  {enableAdminThreadMailFolders && (
                    <Tabs
                      value={adminThreadFolder}
                      onChange={(_, v) => setAdminThreadFolder(v)}
                      variant="fullWidth"
                      sx={folderTabsSx}
                    >
                      <Tab label="All" />
                      <Tab label="From user" />
                      <Tab label="My replies" />
                    </Tabs>
                  )}
                  {adminThreadLiveLoading ? (
                    <SoftBox display="flex" justifyContent="center" py={1}>
                      <CircularProgress size={20} />
                    </SoftBox>
                  ) : adminMessagesToShow.length === 0 ? (
                    <SoftTypography variant="body2" color="secondary" sx={{ mb: 1 }}>
                      No messages in this thread.
                    </SoftTypography>
                  ) : filteredAdminThreadMessages.length === 0 ? (
                    <SoftTypography variant="body2" color="secondary" sx={{ mb: 1 }}>
                      Nothing in this folder.
                    </SoftTypography>
                  ) : (
                    <SoftBox
                      sx={{
                        maxHeight: messageListMaxH,
                        overflow: 'auto',
                        pr: 0.5,
                        mb: 1,
                      }}
                    >
                      {filteredAdminThreadMessages.map((m) => (
                        <MessageBubbleRow
                          key={m.$id}
                          m={m}
                          viewerId={user.$id}
                          teamLabel={teamDisplayName}
                          clientUserId={selectedAdminThread?.clientUserId ?? null}
                          outboundSenderIds={[user.$id, ADMIN_TEAM_ID]}
                          viewerDisplayName={viewerDisplayName}
                          peerDisplayName={selectedAdminThread?.clientDisplayName ?? null}
                        />
                      ))}
                    </SoftBox>
                  )}
                  <SoftBox component="form" onSubmit={handleSendAdmin} display="flex" flexDirection="column" gap={1.25}>
                    <MessageTypeFields
                      messageType={messageType}
                      onMessageType={setMessageType}
                      subject={subject}
                      onSubject={setSubject}
                      siteId={siteId}
                      onSiteId={setSiteId}
                      enabledSites={enabledSites}
                      sitesLoading={sitesLoading}
                      showSite={messageType === 'ticket'}
                    />
                    <SoftBox>
                      <SoftTypography variant="caption" fontWeight="medium" color="text" display="block" mb={0.5}>
                        Message
                      </SoftTypography>
                      <SoftInput
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        multiline
                        rows={2}
                        fullWidth
                        size="small"
                        placeholder="Reply…"
                      />
                    </SoftBox>
                    <SoftButton
                      type="submit"
                      variant="gradient"
                      color="info"
                      size="small"
                      fullWidth
                      disabled={sendMessage.isPending}
                      startIcon={<Icon sx={{ fontSize: 18 }}>send</Icon>}
                    >
                      {sendMessage.isPending ? 'Sending…' : 'Send reply'}
                    </SoftButton>
                  </SoftBox>
                </>
              )}
            </>
          )}
        </>
      )}

      {tab === TAB_FORM && showMemberUi && (
        <SoftBox component="form" onSubmit={handleSendMember} display="flex" flexDirection="column" gap={1.5}>
          <SoftTypography variant="caption" color="secondary">
            {isAdmin ? (
              <>
                As an admin you can optionally choose a member below; otherwise the message goes to the support team
                like a normal user. Manage tickets on the{' '}
                <Link component={RouterLink} to={ROUTE_PATHS.SUPPORT_TICKETS} variant="caption" fontWeight="bold" color="info">
                  tickets
                </Link>{' '}
                page.
              </>
            ) : (
              <>
                Messages go only to the admin team (no recipient field). Manage existing tickets on the{' '}
                <Link component={RouterLink} to={ROUTE_PATHS.SUPPORT_TICKETS} variant="caption" fontWeight="bold" color="info">
                  tickets
                </Link>
                .
              </>
            )}
          </SoftTypography>
          {isAdmin && (
            <SoftBox>
              <SoftTypography
                variant="caption"
                fontWeight="medium"
                color="text"
                display="block"
                mb={0.5}
                sx={{ fontSize: '0.7rem', lineHeight: 1.3 }}
              >
                Send to member (optional)
              </SoftTypography>
              <Autocomplete<AdminUser, false, false, false>
                value={adminReceiver}
                onChange={(_, v) => setAdminReceiver(v)}
                inputValue={adminReceiverQuery}
                onInputChange={(_, v) => setAdminReceiverQuery(v)}
                options={adminSearchUsers}
                loading={adminSearchLoading}
                getOptionLabel={(opt) => `${opt.name} (${opt.email})`}
                isOptionEqualToValue={(a, b) => a.id === b.id}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    size="small"
                    placeholder="Type at least 2 characters…"
                    helperText={
                      adminReceiverQuery.trim().length > 0 && adminReceiverQuery.trim().length < 2
                        ? 'Enter 2+ characters to search'
                        : 'Leave empty to message the team only'
                    }
                    FormHelperTextProps={{ sx: { fontSize: '0.7rem', mt: 0.5, mx: 0 } }}
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {adminSearchLoading ? <CircularProgress color="inherit" size={16} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': { fontSize: '0.875rem', borderRadius: 1 },
                    }}
                  />
                )}
              />
            </SoftBox>
          )}
          <MessageTypeFields
            messageType={messageType}
            onMessageType={setMessageType}
            subject={subject}
            onSubject={setSubject}
            siteId={siteId}
            onSiteId={setSiteId}
            enabledSites={enabledSites}
            sitesLoading={sitesLoading}
            showSite={messageType === 'ticket'}
          />
          <SoftBox>
            <SoftTypography
              variant="caption"
              fontWeight="medium"
              color="text"
              display="block"
              mb={0.5}
              sx={{ fontSize: '0.7rem', lineHeight: 1.3 }}
            >
              Message
            </SoftTypography>
            <SoftInput
              value={body}
              onChange={(e) => setBody(e.target.value)}
              multiline
              rows={4}
              fullWidth
              size="small"
              placeholder="Write your message…"
            />
          </SoftBox>
          <SoftButton
            type="submit"
            variant="gradient"
            color="info"
            size="small"
            fullWidth
            disabled={sendMessage.isPending}
            startIcon={<Icon sx={{ fontSize: 18 }}>send</Icon>}
          >
            {sendMessage.isPending
              ? 'Sending…'
              : messageType === 'ticket'
                ? 'Create ticket'
                : isAdmin && adminReceiver
                  ? 'Send to member'
                  : 'Send to team'}
          </SoftButton>
        </SoftBox>
      )}

      {tab === TAB_FORM && showAdminUi && (
        <SoftBox component="form" onSubmit={handleSendAdmin} display="flex" flexDirection="column" gap={1.5}>
          <SoftBox>
            <SoftTypography
              variant="caption"
              fontWeight="medium"
              color="text"
              display="block"
              mb={0.5}
              sx={{ fontSize: '0.7rem', lineHeight: 1.3 }}
            >
              Send to (search by name or email)
            </SoftTypography>
            <Autocomplete<AdminUser, false, false, false>
              value={adminReceiver}
              onChange={(_, v) => setAdminReceiver(v)}
              inputValue={adminReceiverQuery}
              onInputChange={(_, v) => setAdminReceiverQuery(v)}
              options={adminSearchUsers}
              loading={adminSearchLoading}
              getOptionLabel={(opt) => `${opt.name} (${opt.email})`}
              isOptionEqualToValue={(a, b) => a.id === b.id}
              renderInput={(params) => (
                <TextField
                  {...params}
                  size="small"
                  placeholder="Type at least 2 characters…"
                  helperText={
                    adminReceiverQuery.trim().length > 0 && adminReceiverQuery.trim().length < 2
                      ? 'Enter 2+ characters to search'
                      : 'Pick a user from the list'
                  }
                  FormHelperTextProps={{ sx: { fontSize: '0.7rem', mt: 0.5, mx: 0 } }}
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {adminSearchLoading ? <CircularProgress color="inherit" size={16} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': { fontSize: '0.875rem', borderRadius: 1 },
                  }}
                />
              )}
            />
          </SoftBox>
          <MessageTypeFields
            messageType={messageType}
            onMessageType={setMessageType}
            subject={subject}
            onSubject={setSubject}
            siteId={siteId}
            onSiteId={setSiteId}
            enabledSites={enabledSites}
            sitesLoading={sitesLoading}
            showSite={messageType === 'ticket'}
          />
          <SoftBox>
            <SoftTypography
              variant="caption"
              fontWeight="medium"
              color="text"
              display="block"
              mb={0.5}
              sx={{ fontSize: '0.7rem', lineHeight: 1.3 }}
            >
              Message
            </SoftTypography>
            <SoftInput
              value={body}
              onChange={(e) => setBody(e.target.value)}
              multiline
              rows={4}
              fullWidth
              size="small"
              placeholder="Write your message…"
            />
          </SoftBox>
          <SoftButton
            type="submit"
            variant="gradient"
            color="info"
            size="small"
            fullWidth
            disabled={sendMessage.isPending}
            startIcon={<Icon sx={{ fontSize: 18 }}>send</Icon>}
          >
            {sendMessage.isPending ? 'Sending…' : messageType === 'ticket' ? 'Create ticket' : 'Send to user'}
          </SoftButton>
        </SoftBox>
      )}
    </SoftBox>
  );
};

export default MessagesInboxPanel;
