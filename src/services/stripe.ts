import { fetchStripeJson, postStripeJsonAuthed } from '@/lib/stripe-loader';

// Cache the publishable key after fetching
let stripePublishableKeyCache: string | null = null;

/**
 * Fetch Stripe publishable key from `GET /api/stripe/config` (implemented by your API host; see `publishableConfig.ts`).
 * The secret key stays on the server.
 */
export async function getStripeConfig(): Promise<{ stripe_publishable_key: string }> {
  if (stripePublishableKeyCache) {
    return { stripe_publishable_key: stripePublishableKeyCache };
  }

  try {
    const result = await fetchStripeJson<{
      success?: boolean;
      stripe_publishable_key?: string;
      message?: string;
    }>('/config');

    if (!result?.success || !result?.stripe_publishable_key) {
      throw new Error('Invalid Stripe configuration response');
    }

    stripePublishableKeyCache = result.stripe_publishable_key;
    return { stripe_publishable_key: result.stripe_publishable_key };
  } catch (error) {
    console.error('Failed to retrieve Stripe configuration:', error);
    throw new Error('Stripe configuration is not available');
  }
}

/**
 * Initialize Stripe Elements with publishable key
 * Call this once at app bootstrap
 */
export async function initializeStripe(): Promise<string> {
  const config = await getStripeConfig();
  return config.stripe_publishable_key;
}

/**
 * Opens Stripe Customer Portal (fallback only; primary flows stay in-app).
 */
export async function redirectToBillingPortal(returnUrl?: string): Promise<void> {
  const result = await postStripeJsonAuthed<{ url?: string }>('/user-billing', {
    action: 'billing-portal',
    returnUrl: returnUrl ?? window.location.href,
  });
  if (!result?.url) throw new Error('Billing portal URL not returned.');
  window.location.href = result.url;
}
