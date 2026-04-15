/**
 * Server-only — Appwrite Users API + Stripe. Do not import from React components.
 *
 * Persists `stripe_customer_id` on the Auth user `prefs` (Stripe-as-a-Source; no subscription DB sync).
 */
import { Client, Users } from 'node-appwrite';

import { getStripeFromEnv } from './client';

const PREFS_KEY = 'stripe_customer_id' as const;

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v?.trim()) throw new Error(`${name} is required`);
  return v.trim();
}

function getAppwriteUsers(): Users {
  const client = new Client()
    .setEndpoint(requireEnv('APPWRITE_ENDPOINT'))
    .setProject(requireEnv('APPWRITE_PROJECT_ID'))
    .setKey(requireEnv('APPWRITE_API_KEY'));

  return new Users(client);
}

export interface CreateStripeCustomerParams {
  /** Appwrite Auth user id */
  userId: string;
  email?: string;
  name?: string;
  metadata?: Record<string, string>;
  /** Existing prefs merged; fetched server-side if omitted */
  existingPrefs?: Record<string, unknown>;
}

export interface CreateStripeCustomerResult {
  stripeCustomerId: string;
  customer: import('stripe').Stripe.Customer;
}

/**
 * Creates a Stripe Customer and writes `prefs.stripe_customer_id` for the Appwrite user.
 */
export async function createStripeCustomerAndSavePrefs(
  params: CreateStripeCustomerParams,
): Promise<CreateStripeCustomerResult> {
  const stripe = getStripeFromEnv();
  const users = getAppwriteUsers();

  const prefs =
    params.existingPrefs ??
    (await users.get(params.userId)).prefs ??
    ({} as Record<string, unknown>);

  const existingId = prefs[PREFS_KEY];
  if (typeof existingId === 'string' && existingId.startsWith('cus_')) {
    const customer = await stripe.customers.retrieve(existingId, {
      expand: ['invoice_settings.default_payment_method'],
    });
    if (!('deleted' in customer && customer.deleted)) {
      return { stripeCustomerId: customer.id, customer };
    }
  }

  const customer = await stripe.customers.create({
    email: params.email,
    name: params.name,
    metadata: {
      appwrite_user_id: params.userId,
      ...params.metadata,
    },
    expand: ['invoice_settings.default_payment_method'],
  });

  await users.updatePrefs({
    userId: params.userId,
    prefs: {
      ...prefs,
      [PREFS_KEY]: customer.id,
    },
  });

  return { stripeCustomerId: customer.id, customer };
}

export { PREFS_KEY as STRIPE_CUSTOMER_ID_PREFS_KEY };
