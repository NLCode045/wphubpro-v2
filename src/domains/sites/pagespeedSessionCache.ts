import type { SitePagespeedResult } from '@/types';

const STORAGE_KEY = 'wphubpro-psi-v1';

type ByStrategy = Partial<Record<'desktop' | 'mobile', SitePagespeedResult>>;

type PayloadV1 = {
  v: 1;
  userId: string;
  bySite: Record<string, ByStrategy>;
};

function safeParsePayload(raw: string | null): PayloadV1 | null {
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as PayloadV1;
    if (o?.v !== 1 || typeof o.userId !== 'string' || typeof o.bySite !== 'object' || o.bySite == null) return null;
    return o;
  } catch {
    return null;
  }
}

function readPayload(): PayloadV1 | null {
  if (typeof sessionStorage === 'undefined') return null;
  return safeParsePayload(sessionStorage.getItem(STORAGE_KEY));
}

function writePayload(p: PayloadV1): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {
    /* quota / private mode */
  }
}

export function clearPagespeedSessionStorage(): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function getPagespeedFromSession(
  userId: string,
  siteId: string,
  strategy: 'desktop' | 'mobile',
): SitePagespeedResult | undefined {
  const p = readPayload();
  if (!p || p.userId !== userId) return undefined;
  return p.bySite[siteId]?.[strategy];
}

export function setPagespeedInSession(
  userId: string,
  siteId: string,
  strategy: 'desktop' | 'mobile',
  data: SitePagespeedResult,
): void {
  const existing = readPayload();
  const base: PayloadV1 =
    existing && existing.userId === userId ? existing : { v: 1, userId, bySite: {} };
  const prev = base.bySite[siteId] ?? {};
  base.bySite[siteId] = { ...prev, [strategy]: data };
  writePayload(base);
}

export function removeSitePagespeedFromSession(userId: string, siteId: string): void {
  const p = readPayload();
  if (!p || p.userId !== userId) return;
  const next = { ...p, bySite: { ...p.bySite } };
  delete next.bySite[siteId];
  writePayload(next);
}

export function isSitePagespeedSessionComplete(
  userId: string,
  siteId: string,
): boolean {
  return (
    getPagespeedFromSession(userId, siteId, 'desktop') != null &&
    getPagespeedFromSession(userId, siteId, 'mobile') != null
  );
}

/** Hydrate React Query from session JSON for the signed-in user */
export function forEachStoredPagespeed(
  userId: string,
  fn: (siteId: string, strategy: 'desktop' | 'mobile', data: SitePagespeedResult) => void,
): void {
  const p = readPayload();
  if (!p || p.userId !== userId) return;
  for (const [siteId, byS] of Object.entries(p.bySite)) {
    if (!byS) continue;
    for (const strategy of ['desktop', 'mobile'] as const) {
      const d = byS[strategy];
      if (d) fn(siteId, strategy, d);
    }
  }
}
