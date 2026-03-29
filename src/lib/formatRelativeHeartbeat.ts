/** Fuzzy relative labels for the site bridge heartbeat (local calendar day boundaries). */
export function formatRelativeHeartbeatLabel(isoOrTimestamp: string): string | null {
  const then = new Date(isoOrTimestamp);
  if (Number.isNaN(then.getTime())) return null;

  const now = new Date();
  const diffMs = now.getTime() - then.getTime();
  if (diffMs < 0) return '1 minute ago';

  const diffMinutes = Math.floor(diffMs / 60000);

  const thenDay = new Date(then.getFullYear(), then.getMonth(), then.getDate()).getTime();
  const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const calendarDaysApart = Math.round((nowDay - thenDay) / 86400000);

  if (calendarDaysApart === 0) {
    if (diffMinutes < 2) return '1 minute ago';
    if (diffMinutes < 60) return 'an hour ago';
    return 'earlier today';
  }
  if (calendarDaysApart === 1) return 'yesterday';
  if (calendarDaysApart === 2) return '2 days ago';
  if (calendarDaysApart >= 3 && calendarDaysApart <= 6) return 'some days ago';
  if (calendarDaysApart >= 7 && calendarDaysApart <= 13) return 'last week';
  if (calendarDaysApart >= 14 && calendarDaysApart <= 45) return 'a month ago';
  return 'a while ago';
}
