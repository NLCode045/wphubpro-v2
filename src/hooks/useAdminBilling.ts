import { useQuery } from '@tanstack/react-query';

import { fetchAdminBillingOverview, fetchAdminInvoice } from '@/lib/stripeAdminApi';

export const adminBillingOverviewQueryKey = ['stripe-admin', 'billing', 'overview'] as const;

export function adminInvoiceQueryKey(id: string) {
  return ['stripe-admin', 'billing', 'invoice', id] as const;
}

export function useAdminBillingOverview() {
  return useQuery({
    queryKey: adminBillingOverviewQueryKey,
    queryFn: fetchAdminBillingOverview,
    staleTime: 20_000,
  });
}

export function useAdminInvoiceDetail(invoiceId: string | undefined) {
  return useQuery({
    queryKey: invoiceId ? adminInvoiceQueryKey(invoiceId) : ['stripe-admin', 'billing', 'invoice', 'none'],
    queryFn: () => fetchAdminInvoice(invoiceId!),
    enabled: Boolean(invoiceId),
  });
}
