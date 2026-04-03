export type ProfilePrefs = {
  website?: string;
  companyName?: string;
  country?: string;
  timezone?: string;
  language?: string;
  notifyEmail?: boolean;
  notifyPlatform?: boolean;
  /** When true, this user must sign in with Appwrite email OTP (no password / OAuth on login UI). */
  loginWithEmailOtpOnly?: boolean;
};

/** Appwrite user prefs object (arbitrary JSON). */
export type PrefsRecord = Record<string, unknown>;

export function parseProfilePrefs(prefs: PrefsRecord | undefined | null): ProfilePrefs {
  if (!prefs || typeof prefs !== 'object') return {};
  const p = prefs as Record<string, unknown>;
  const bool = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback);
  return {
    website: typeof p.website === 'string' ? p.website : undefined,
    companyName: typeof p.companyName === 'string' ? p.companyName : undefined,
    country: typeof p.country === 'string' ? p.country : undefined,
    timezone: typeof p.timezone === 'string' ? p.timezone : undefined,
    language: typeof p.language === 'string' ? p.language : undefined,
    notifyEmail: p.notifyEmail === undefined ? undefined : bool(p.notifyEmail, true),
    notifyPlatform: p.notifyPlatform === undefined ? undefined : bool(p.notifyPlatform, true),
    loginWithEmailOtpOnly:
      p.loginWithEmailOtpOnly === undefined ? undefined : bool(p.loginWithEmailOtpOnly, false),
  };
}

export function mergeProfilePrefs(existing: PrefsRecord | undefined | null, patch: Partial<ProfilePrefs>): PrefsRecord {
  const base =
    existing && typeof existing === 'object' && !Array.isArray(existing) ? { ...existing } : {};
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    base[k] = v;
  }
  return base;
}
