import { ADMIN_TEAM_ID } from '../../config/contactMessages';
import type { Message } from '../../types';

/** Matches server `displayNameFromUserDoc`: name, else email local-part. */
export function accountDisplayLabel(user: {
  name?: string | null;
  email?: string | null;
} | null | undefined): string | undefined {
  if (!user) return undefined;
  const n = user.name && String(user.name).trim();
  if (n) return n;
  const em = user.email && String(user.email).trim();
  if (!em) return undefined;
  const at = em.indexOf('@');
  return at > 0 ? em.slice(0, at) : em;
}

/**
 * Human-readable sender line for a message bubble.
 * - Own user messages → `viewerDisplayName` or "You"
 * - Team / support mailbox → `teamLabel` (Appwrite team name or "Support")
 * - Member → `authorName` from API, else `peerDisplayName`, else "Member"
 */
export function messageSenderLabel(params: {
  m: Message;
  viewerId: string;
  teamLabel: string;
  clientUserId?: string | null;
  outboundSenderIds?: string[];
  /** Logged-in user's display (name or email local-part) instead of "You". */
  viewerDisplayName?: string | null;
  /** Known thread peer label (admin inbox) when `authorName` is missing. */
  peerDisplayName?: string | null;
}): string {
  const { m, viewerId, teamLabel, clientUserId, outboundSenderIds, viewerDisplayName, peerDisplayName } = params;
  const mine =
    outboundSenderIds && outboundSenderIds.length > 0
      ? outboundSenderIds.includes(m.sender)
      : m.sender === viewerId;

  if (mine) {
    if (m.sender === ADMIN_TEAM_ID) return teamLabel;
    const vd = viewerDisplayName && String(viewerDisplayName).trim();
    return vd || 'You';
  }

  if (m.sender === ADMIN_TEAM_ID) return teamLabel;

  const name = m.authorName?.trim();
  if (name) return name;

  if (clientUserId && m.sender === clientUserId) {
    const pd = peerDisplayName && String(peerDisplayName).trim();
    return pd || 'Member';
  }

  return 'Member';
}
