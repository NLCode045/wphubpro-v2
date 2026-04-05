import type { SupportTicketCategory, SupportTicketContext } from '@/types';

/** Passed via `navigate(SUPPORT_NEW, { state })` from contextual “Contact support” buttons. */
export type SupportTicketCreateLocationState = {
  category?: SupportTicketCategory;
  context?: Partial<SupportTicketContext>;
} | null;
