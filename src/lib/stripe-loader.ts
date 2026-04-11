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

function isProbablyHtml(body: string): boolean {
  const s = body.trimStart();
  return s.startsWith('<!') || s.startsWith('<html') || s.startsWith('<HTML');
}

function shortNonJsonError(status: number, body: string): Error {
  if (isProbablyHtml(body)) {
    const router = /router protection|general_access_forbidden|Error 401/i.test(body);
    const msg = router
      ? `API returned HTML (${status}, Appwrite router / domain protection). Add http://localhost:5173 (or your dev URL) under Appwrite Project → Settings → Platforms, or call an API base that allows this origin.`
      : `API returned HTML instead of JSON (${status}). Check that the Stripe admin HTTP routes exist and return JSON.`;
    return new Error(msg);
  }
  const snippet = body.length > 400 ? `${body.slice(0, 400)}…` : body;
  return new Error(snippet || `Request failed (${status})`);
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
    throw shortNonJsonError(res.status, text);
  }
  if (!text) {
    return {} as T;
  }
  if (isProbablyHtml(text)) {
    throw shortNonJsonError(res.status, text);
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Invalid JSON from API (Content-Type may be wrong). First bytes: ${text.slice(0, 120)}`);
  }
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
