/**
 * Server-only — live invoices from Stripe. Do not import from React components.
 */
import { getStripeFromEnv, type StripeClient } from './client';

/**
 * GET: invoices for a Stripe customer id (newest first).
 */
export async function listInvoicesForCustomer(
  customerId: string,
  options?: { limit?: number },
): Promise<Awaited<ReturnType<StripeClient['invoices']['list']>>> {
  const stripe = getStripeFromEnv();
  const limit = options?.limit ?? 50;
  return stripe.invoices.list({
    customer: customerId,
    limit,
    expand: [
      'data.payment_intent',
      'data.charge',
      'data.lines.data.price.product',
      'data.customer',
    ],
  });
}
