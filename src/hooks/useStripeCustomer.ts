import { useMemo } from 'react';

import { useAuth } from '@/domains/auth';

const PREFS_KEY = 'stripe_customer_id';

/**
 * Reads `stripe_customer_id` from Appwrite Auth `user.prefs` (Stripe-as-a-Source).
 */
export function useStripeCustomer() {
  const { user } = useAuth();

  return useMemo(() => {
    const raw = user?.prefs?.[PREFS_KEY];
    const stripeCustomerId =
      typeof raw === 'string' && raw.trim().startsWith('cus_') ? raw.trim() : null;
    return {
      stripeCustomerId,
      hasStripeCustomer: Boolean(stripeCustomerId),
    };
  }, [user?.prefs]);
}
