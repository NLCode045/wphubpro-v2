import { loadStripe, type Stripe as StripeJs } from '@stripe/stripe-js';

/** Proxied REST base (`vite` → backend). */
export const STRIPE_API_BASE = '/api/stripe' as const;

const viteEnv = import.meta.env as Record<string, string | undefined>;

function readPublishableKey(): string {
  return (
    viteEnv.STRIPE_PUBLISHABLE_KEY ||
    viteEnv.VITE_STRIPE_PUBLISHABLE_KEY ||
    viteEnv._STRIPE_PUBLISHABLE_KEY ||
    ''
  ).trim();
}

let stripePromise: Promise<StripeJs | null> | null = null;

/**
 * Singleton `loadStripe` — uses `STRIPE_PUBLISHABLE_KEY` / `VITE_STRIPE_PUBLISHABLE_KEY` (see `vite.config.ts` `define`).
 */
export function getStripe(): Promise<StripeJs | null> {
  const key = readPublishableKey();
  if (!key) {
    return Promise.resolve(null);
  }
  if (!stripePromise) {
    stripePromise = loadStripe(key);
  }
  return stripePromise;
}

export async function fetchStripeJson<T>(path: string, init?: RequestInit): Promise<T> {
  const url = path.startsWith('http') ? path : `${STRIPE_API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
  const res = await fetch(url, {
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...init?.headers,
    },
    ...init,
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(text || `Request failed (${res.status})`);
  }
  return (text ? (JSON.parse(text) as T) : ({} as T)) as T;
}

export async function postStripeJson<T>(path: string, body: unknown): Promise<T> {
  return fetchStripeJson<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function patchStripeJson<T>(path: string, body: unknown): Promise<T> {
  return fetchStripeJson<T>(path, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
