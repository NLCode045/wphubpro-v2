import type { SupportTicketCategory, Ticket, TicketStatus } from '@/types';

export const SUPPORT_CATEGORY_LABELS: Record<SupportTicketCategory, string> = {
  account: 'Account',
  site_manager: 'Site Manager',
  library: 'Library',
  billing: 'Billing',
  other: 'Other',
};

export function categoryLabel(cat: string | undefined): string {
  if (!cat) return '—';
  return SUPPORT_CATEGORY_LABELS[cat as SupportTicketCategory] ?? cat;
}

export function formatTicketStatus(status: string): string {
  const map: Record<string, string> = {
    open: 'Open',
    in_progress: 'In progress',
    waiting: 'Waiting',
    resolved: 'Resolved',
    closed: 'Closed',
  };
  return map[status] ?? status;
}

export function statusBadgeClass(status: TicketStatus | string): string {
  switch (status) {
    case 'open':
      return 'bg-primary-subtle text-primary';
    case 'in_progress':
      return 'bg-info-subtle text-info';
    case 'waiting':
      return 'bg-warning-subtle text-warning';
    case 'resolved':
      return 'bg-success-subtle text-success';
    case 'closed':
      return 'bg-secondary-subtle text-secondary';
    default:
      return 'bg-secondary-subtle text-secondary';
  }
}

export function priorityBadgeClass(priority: string): string {
  switch (priority) {
    case 'urgent':
    case 'high':
      return 'text-bg-danger';
    case 'medium':
      return 'text-bg-warning';
    case 'low':
      return 'text-bg-primary';
    default:
      return 'text-bg-secondary';
  }
}

export function formatPriority(priority: string): string {
  return priority.charAt(0).toUpperCase() + priority.slice(1);
}

export function ticketCounts(tickets: Ticket[]) {
  const openish = tickets.filter((t) =>
    ['open', 'in_progress', 'waiting'].includes(t.status)
  ).length;
  const resolved = tickets.filter((t) => t.status === 'resolved').length;
  const closed = tickets.filter((t) => t.status === 'closed').length;
  return { openish, resolved, closed, total: tickets.length };
}
