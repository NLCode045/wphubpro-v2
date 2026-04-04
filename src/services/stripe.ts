import { executeFunction } from '@/integrations/appwrite/executeFunction';
import { APPWRITE_FUNCTION_IDS } from '@/services/appwrite';

/**
 * Opens Stripe Customer Portal (fallback only; primary flows stay in-app).
 */
export async function redirectToBillingPortal(returnUrl?: string): Promise<void> {
  const result = await executeFunction<{ url?: string }>(APPWRITE_FUNCTION_IDS.STRIPE_PORTAL_LINK, {
    returnUrl: returnUrl ?? window.location.href,
  });
  if (!result?.url) throw new Error('Billing portal URL not returned.');
  window.location.href = result.url;
}
