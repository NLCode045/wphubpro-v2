export function formatChecked(iso: string | undefined): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return '—';
  }
}

/** Short date and short time separated by " - " (site health header). */
export function formatSiteHealthCheckedOn(iso: string | undefined): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return `${d.toLocaleDateString(undefined, { dateStyle: 'short' })} - ${d.toLocaleTimeString(undefined, { timeStyle: 'short' })}`;
  } catch {
    return '—';
  }
}
