/**
 * Server-only — Stripe publishable key for `GET /stripe/config` (safe to expose to the browser).
 */
import { ApiError } from '../appwrite/apiResponse';

export function getStripePublishableConfig(): { success: true; stripe_publishable_key: string } {
  const stripe_publishable_key =
    process.env.STRIPE_PUBLISHABLE_KEY?.trim() ||
    process.env.VITE_STRIPE_PUBLISHABLE_KEY?.trim() ||
    '';
  if (!stripe_publishable_key) {
    throw new ApiError(500, 'INTERNAL', 'STRIPE_PUBLISHABLE_KEY is not configured on the API host');
  }
  return { success: true, stripe_publishable_key };
}
