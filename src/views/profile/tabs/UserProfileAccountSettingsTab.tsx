import { useAuth } from '@/domains/auth';
import { type PrefsRecord, parseProfilePrefs } from '@/domains/profile/profilePrefs';
import { account } from '@/services/appwrite';
import { PROFILE_COUNTRY_OPTIONS, PROFILE_LANGUAGE_OPTIONS, getProfileTimezoneOptions } from '@/views/profile/tabs/profileFormConstants';
import { useMutation } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Form, Spinner } from 'react-bootstrap';

const UserProfileAccountSettingsTab = () => {
  const { user, refreshUser } = useAuth();
  const timezones = useMemo(() => getProfileTimezoneOptions(), []);
  const initial = useMemo(() => parseProfilePrefs(user?.prefs), [user?.prefs]);

  const [website, setWebsite] = useState(initial.website ?? '');
  const [companyName, setCompanyName] = useState(initial.companyName ?? '');
  const [country, setCountry] = useState(initial.country ?? '');
  const [timezone, setTimezone] = useState(() => initial.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
  const [language, setLanguage] = useState(initial.language ?? 'en');
  const [message, setMessage] = useState<{ variant: 'success' | 'danger'; text: string } | null>(null);

  useEffect(() => {
    const p = parseProfilePrefs((user?.prefs ?? null) as PrefsRecord | null);
    setWebsite(p.website ?? '');
    setCompanyName(p.companyName ?? '');
    setCountry(p.country ?? '');
    setTimezone(p.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
    setLanguage(p.language ?? 'en');
  }, [user?.prefs]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not signed in.');
      const base: PrefsRecord =
        user.prefs && typeof user.prefs === 'object' && !Array.isArray(user.prefs)
          ? { ...(user.prefs as PrefsRecord) }
          : {};
      const w = website.trim();
      const co = companyName.trim();
      const c = country.trim();
      const tz = timezone.trim();
      const lang = language.trim();
      if (w) base.website = w;
      else delete base.website;
      if (co) base.companyName = co;
      else delete base.companyName;
      if (c) base.country = c;
      else delete base.country;
      if (tz) base.timezone = tz;
      else delete base.timezone;
      if (lang) base.language = lang;
      else delete base.language;
      await account.updatePrefs(base);
    },
    onSuccess: async () => {
      setMessage({ variant: 'success', text: 'Account settings saved.' });
      await refreshUser();
    },
    onError: (err: unknown) => {
      setMessage({ variant: 'danger', text: err instanceof Error ? err.message : 'Could not save settings.' });
    },
  });

  return (
    <div>
      <p className="text-muted fs-xs text-uppercase fw-semibold mb-2">Regional & organization</p>
      <p className="text-muted fs-sm mb-4">These preferences are stored on your Appwrite user profile and used across the platform UI.</p>

      {message ? (
        <Alert variant={message.variant} className="py-2 fs-sm mb-3">
          {message.text}
        </Alert>
      ) : null}

      <Form
        className="row g-3"
        onSubmit={(e) => {
          e.preventDefault();
          setMessage(null);
          saveMutation.mutate();
        }}
      >
        <Form.Group className="col-12 col-md-6" controlId="profile-website">
          <Form.Label className="fs-sm">Website (optional)</Form.Label>
          <Form.Control type="url" placeholder="https://example.com" value={website} onChange={(e) => setWebsite(e.target.value)} />
        </Form.Group>
        <Form.Group className="col-12 col-md-6" controlId="profile-company">
          <Form.Label className="fs-sm">Company name (optional)</Form.Label>
          <Form.Control type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Acme Inc." />
        </Form.Group>
        <Form.Group className="col-12 col-md-6" controlId="profile-country">
          <Form.Label className="fs-sm">Country</Form.Label>
          <Form.Select value={country} onChange={(e) => setCountry(e.target.value)}>
            <option value="">Select country…</option>
            {PROFILE_COUNTRY_OPTIONS.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </Form.Select>
        </Form.Group>
        <Form.Group className="col-12 col-md-6" controlId="profile-language">
          <Form.Label className="fs-sm">Language</Form.Label>
          <Form.Select value={language} onChange={(e) => setLanguage(e.target.value)}>
            {PROFILE_LANGUAGE_OPTIONS.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </Form.Select>
        </Form.Group>
        <Form.Group className="col-12" controlId="profile-timezone">
          <Form.Label className="fs-sm">Timezone</Form.Label>
          <Form.Select value={timezone} onChange={(e) => setTimezone(e.target.value)}>
            {timezones.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </Form.Select>
        </Form.Group>
        <div className="col-12">
          <Button type="submit" variant="primary" size="sm" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Saving…
              </>
            ) : (
              'Save account settings'
            )}
          </Button>
        </div>
      </Form>
    </div>
  );
};

export default UserProfileAccountSettingsTab;
