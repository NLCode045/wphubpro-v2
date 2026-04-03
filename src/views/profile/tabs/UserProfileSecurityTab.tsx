import { useAuth, usePublicAuthConfig } from '@/domains/auth';
import { mergeProfilePrefs, parseProfilePrefs, type PrefsRecord, type ProfilePrefs } from '@/domains/profile/profilePrefs';
import { account } from '@/services/appwrite';
import { AuthenticatorType } from 'appwrite';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Alert, Button, Form, Spinner } from 'react-bootstrap';

type ConfigurePanel = 'otp' | 'totp' | null;

const UserProfileSecurityTab = () => {
  const { user, refreshUser } = useAuth();
  const { data: publicAuth } = usePublicAuthConfig();
  const queryClient = useQueryClient();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwMessage, setPwMessage] = useState<{ variant: 'success' | 'danger'; text: string } | null>(null);

  const [mfaUri, setMfaUri] = useState<string | null>(null);
  const [mfaSecret, setMfaSecret] = useState<string | null>(null);
  const [mfaOtp, setMfaOtp] = useState('');
  const [mfaMessage, setMfaMessage] = useState<{ variant: 'success' | 'danger'; text: string } | null>(null);

  const [wantsMfaSetup, setWantsMfaSetup] = useState(false);
  const [openConfigure, setOpenConfigure] = useState<ConfigurePanel>(null);
  const [mfaOtpEmailDraft, setMfaOtpEmailDraft] = useState('');

  const forceMfa = Boolean(publicAuth?.forceMfaForAllUsers);
  const platformMail = publicAuth?.mfaOtpMailEnabled !== false;
  const platformTotp = publicAuth?.mfaAuthenticatorEnabled !== false;

  const [prefEmailMfa, setPrefEmailMfa] = useState(true);
  const [prefAuthenticatorMfa, setPrefAuthenticatorMfa] = useState(true);

  const factorsQuery = useQuery({
    queryKey: ['mfa-factors'],
    queryFn: () => account.listMfaFactors(),
    enabled: Boolean(user),
  });

  const p = parseProfilePrefs((user?.prefs ?? null) as PrefsRecord | null);
  const mfaEnabled = Boolean(user && typeof user.mfa === 'boolean' && user.mfa);

  useEffect(() => {
    if (mfaEnabled) setWantsMfaSetup(false);
  }, [mfaEnabled]);

  useEffect(() => {
    setPrefEmailMfa(p.mfaFactorEmailEnabled !== false);
    setPrefAuthenticatorMfa(p.mfaFactorAuthenticatorEnabled !== false);
    const delivery = p.mfaOtpDeliveryEmail?.trim() || user?.email?.trim() || '';
    setMfaOtpEmailDraft(delivery);
  }, [user?.prefs, user?.email, p.mfaFactorEmailEnabled, p.mfaFactorAuthenticatorEnabled, p.mfaOtpDeliveryEmail]);

  const factorPrefMutation = useMutation({
    mutationFn: async (patch: { mfaFactorEmailEnabled?: boolean; mfaFactorAuthenticatorEnabled?: boolean }) => {
      if (!user) throw new Error('Not signed in.');
      const base = mergeProfilePrefs(user.prefs as PrefsRecord | null, patch);
      await account.updatePrefs(base);
    },
    onSuccess: async () => {
      await refreshUser();
    },
    onError: async (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Could not save preference.';
      setMfaMessage({ variant: 'danger', text: msg });
      await refreshUser();
    },
  });

  const saveOtpEmailMutation = useMutation({
    mutationFn: async (email: string) => {
      if (!user) throw new Error('Not signed in.');
      const trimmed = email.trim();
      if (!trimmed) throw new Error('Enter an email address.');
      const base = mergeProfilePrefs(user.prefs as PrefsRecord | null, {
        mfaOtpDeliveryEmail: trimmed,
      });
      await account.updatePrefs(base);
    },
    onSuccess: async () => {
      setMfaMessage({ variant: 'success', text: 'MFA OTP email saved.' });
      await refreshUser();
    },
    onError: async (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Could not save email.';
      setMfaMessage({ variant: 'danger', text: msg });
      await refreshUser();
    },
  });

  const passwordMutation = useMutation({
    mutationFn: async () => {
      if (newPassword !== confirmPassword) throw new Error('New passwords do not match.');
      if (newPassword.length < 8) throw new Error('Password must be at least 8 characters.');
      await account.updatePassword(newPassword, oldPassword);
    },
    onSuccess: async () => {
      setPwMessage({ variant: 'success', text: 'Password updated.' });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      await refreshUser();
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Could not update password.';
      setPwMessage({ variant: 'danger', text: msg });
    },
  });

  const tryEnableMfaMutation = useMutation({
    mutationFn: async () => {
      await account.updateMFA(true);
      const u = await account.get();
      const base = mergeProfilePrefs(u.prefs as PrefsRecord | null, {
        mfaFactorEmailEnabled: true,
      } satisfies Partial<ProfilePrefs>);
      await account.updatePrefs(base);
    },
    onSuccess: async () => {
      setMfaMessage({ variant: 'success', text: 'MFA is enabled. OTP mail is on by default for sign-in.' });
      await refreshUser();
      await queryClient.invalidateQueries({ queryKey: ['mfa-factors'] });
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof Error
          ? err.message
          : 'Could not enable MFA yet. Turn on the methods below and complete configuration.';
      setMfaMessage({ variant: 'danger', text: msg });
    },
  });

  const startTotpMutation = useMutation({
    mutationFn: () => account.createMfaAuthenticator(AuthenticatorType.Totp),
    onSuccess: (mfa) => {
      setMfaUri(mfa.uri);
      setMfaSecret(mfa.secret);
      setMfaMessage(null);
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Could not start authenticator setup.';
      setMfaMessage({ variant: 'danger', text: msg });
    },
  });

  const verifyTotpMutation = useMutation({
    mutationFn: async (otp: string) => {
      await account.updateMfaAuthenticator(AuthenticatorType.Totp, otp);
      await account.updateMFA(true);
    },
    onSuccess: async () => {
      setMfaMessage({ variant: 'success', text: 'Authenticator verified. MFA is enabled.' });
      setMfaUri(null);
      setMfaSecret(null);
      setMfaOtp('');
      try {
        const u = await account.get();
        const base = mergeProfilePrefs(u.prefs as PrefsRecord | null, {
          mfaFactorEmailEnabled: true,
          mfaFactorAuthenticatorEnabled: true,
        } satisfies Partial<ProfilePrefs>);
        await account.updatePrefs(base);
      } catch {
        /* optional */
      }
      await refreshUser();
      await queryClient.invalidateQueries({ queryKey: ['mfa-factors'] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Invalid code or verification failed.';
      setMfaMessage({ variant: 'danger', text: msg });
    },
  });

  const removeTotpMutation = useMutation({
    mutationFn: () => account.deleteMfaAuthenticator(AuthenticatorType.Totp),
    onSuccess: async () => {
      setMfaMessage({ variant: 'success', text: 'Authenticator app removed from this account.' });
      setMfaUri(null);
      setMfaSecret(null);
      await refreshUser();
      await queryClient.invalidateQueries({ queryKey: ['mfa-factors'] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Could not remove authenticator.';
      setMfaMessage({ variant: 'danger', text: msg });
    },
  });

  const disableMfaMutation = useMutation({
    mutationFn: async () => {
      if (platformTotp) {
        try {
          await account.deleteMfaAuthenticator(AuthenticatorType.Totp);
        } catch {
          /* factor may already be removed */
        }
      }
      await account.updateMFA(false);
    },
    onSuccess: async () => {
      setMfaMessage({ variant: 'success', text: 'MFA has been turned off for this account.' });
      setMfaUri(null);
      setMfaSecret(null);
      setMfaOtp('');
      setOpenConfigure(null);
      setWantsMfaSetup(false);
      await refreshUser();
      await queryClient.invalidateQueries({ queryKey: ['mfa-factors'] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Could not disable MFA.';
      setMfaMessage({ variant: 'danger', text: msg });
    },
  });

  const totpReady = factorsQuery.data?.totp === true;
  const emailReady = factorsQuery.data?.email === true;

  const emailSignInActive = platformMail && emailReady && prefEmailMfa;
  const authenticatorSignInActive = platformTotp && totpReady && prefAuthenticatorMfa;
  const otpMailOnlyMethod = mfaEnabled && emailSignInActive && !authenticatorSignInActive;
  const authenticatorOnlyMethod = mfaEnabled && authenticatorSignInActive && !emailSignInActive;

  const revealMfaOptions = mfaEnabled || wantsMfaSetup;
  const canTurnOffMfa = mfaEnabled && !forceMfa;

  const persistFactorPrefs = (patch: { mfaFactorEmailEnabled?: boolean; mfaFactorAuthenticatorEnabled?: boolean }) => {
    const nextEmail =
      patch.mfaFactorEmailEnabled !== undefined ? patch.mfaFactorEmailEnabled : prefEmailMfa;
    const nextAuth =
      patch.mfaFactorAuthenticatorEnabled !== undefined ? patch.mfaFactorAuthenticatorEnabled : prefAuthenticatorMfa;
    const nextEmailActive = platformMail && emailReady && nextEmail;
    const nextAuthActive = platformTotp && totpReady && nextAuth;
    if (mfaEnabled && !nextEmailActive && !nextAuthActive) {
      setMfaMessage({
        variant: 'danger',
        text: 'With MFA on, keep at least one sign-in method enabled (OTP mail or authenticator).',
      });
      return;
    }
    if (patch.mfaFactorEmailEnabled !== undefined) setPrefEmailMfa(patch.mfaFactorEmailEnabled);
    if (patch.mfaFactorAuthenticatorEnabled !== undefined) setPrefAuthenticatorMfa(patch.mfaFactorAuthenticatorEnabled);
    setMfaMessage(null);
    factorPrefMutation.mutate(patch);
  };

  const toggleConfigure = (panel: Exclude<ConfigurePanel, null>) => {
    setOpenConfigure((prev) => (prev === panel ? null : panel));
  };

  const onMasterMfaChange = (checked: boolean) => {
    setMfaMessage(null);
    if (checked) {
      setWantsMfaSetup(true);
      tryEnableMfaMutation.mutate();
      return;
    }
    setWantsMfaSetup(false);
    setOpenConfigure(null);
    if (mfaEnabled && !forceMfa) {
      disableMfaMutation.mutate();
    }
  };

  return (
    <div className="d-flex flex-column gap-4">
      <section>
        <p className="text-muted fs-xs text-uppercase fw-semibold mb-2">Change password</p>
        <p className="text-muted fs-sm mb-3">Use a strong password you do not reuse elsewhere.</p>
        {pwMessage ? (
          <Alert variant={pwMessage.variant} className="py-2 fs-sm">
            {pwMessage.text}
          </Alert>
        ) : null}
        <Form
          className="row g-3"
          onSubmit={(e) => {
            e.preventDefault();
            setPwMessage(null);
            passwordMutation.mutate();
          }}
        >
          <Form.Group className="col-12 col-md-6" controlId="profile-old-password">
            <Form.Label className="fs-sm">Current password</Form.Label>
            <Form.Control
              type="password"
              autoComplete="current-password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              required
            />
          </Form.Group>
          <div className="w-100 d-none d-md-block" />
          <Form.Group className="col-12 col-md-6" controlId="profile-new-password">
            <Form.Label className="fs-sm">New password</Form.Label>
            <Form.Control
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
            />
          </Form.Group>
          <Form.Group className="col-12 col-md-6" controlId="profile-confirm-password">
            <Form.Label className="fs-sm">Confirm new password</Form.Label>
            <Form.Control
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
            />
          </Form.Group>
          <div className="col-12">
            <Button type="submit" variant="primary" size="sm" disabled={passwordMutation.isPending}>
              {passwordMutation.isPending ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Updating…
                </>
              ) : (
                'Update password'
              )}
            </Button>
          </div>
        </Form>
      </section>

      <hr className="my-0 border-light" />

      <section>
        <p className="text-muted fs-xs text-uppercase fw-semibold mb-2">Multi-factor authentication (MFA)</p>
        <p className="text-muted fs-sm mb-3">
          Your administrator chooses which methods are available. Turn MFA on to configure OTP mail
          {platformTotp ? ' and/or an authenticator app' : ''}.
        </p>

        {forceMfa ? (
          <Alert variant="info" className="py-2 fs-sm mb-3">
            Your organization requires MFA. You cannot turn it off while this policy is active.
          </Alert>
        ) : null}

        {factorsQuery.isLoading ? (
          <Spinner animation="border" size="sm" className="mb-3" />
        ) : null}

        {mfaMessage ? (
          <Alert variant={mfaMessage.variant} className="py-2 fs-sm">
            {mfaMessage.text}
          </Alert>
        ) : null}

        <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
          <span className={`badge ${mfaEnabled ? 'badge-soft-success' : 'badge-soft-secondary'} fs-xs`}>
            {mfaEnabled ? 'MFA on' : 'MFA off'}
          </span>
          {platformMail && emailReady ? (
            <span className="badge badge-soft-info fs-xs">Email OTP available</span>
          ) : null}
          {platformTotp && totpReady ? (
            <span className="badge badge-soft-info fs-xs">Authenticator configured</span>
          ) : null}
        </div>

        <Form.Group className="mb-3">
          <Form.Check
            type="switch"
            id="profile-mfa-master"
            label="Enable multi-factor authentication"
            checked={mfaEnabled}
            disabled={
              tryEnableMfaMutation.isPending ||
              disableMfaMutation.isPending ||
              (forceMfa && mfaEnabled)
            }
            onChange={(e) => onMasterMfaChange(e.target.checked)}
          />
          <Form.Text className="d-block">
            When enabled, sign-in can require a second step. If turning on fails, use the options below to finish setup.
          </Form.Text>
        </Form.Group>

        {revealMfaOptions ? (
          <>
            <p className="text-muted fs-xs text-uppercase fw-semibold mb-2 mt-2">MFA methods</p>
            <p className="text-muted fs-sm mb-3">
              Choose which methods we may offer after your password. Use <strong>Configure</strong> for each method you
              turn on. With MFA active, at least one method must stay enabled.
            </p>

            {!platformMail && !platformTotp ? (
              <Alert variant="warning" className="py-2 fs-sm mb-3">
                No MFA methods are enabled in platform settings. Contact your administrator.
              </Alert>
            ) : null}

            {platformMail ? (
              <div className="border rounded p-3 mb-3">
                <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
                  <Form.Check
                    type="switch"
                    id="profile-mfa-pref-email"
                    className="mb-0"
                    label="OTP mail"
                    checked={prefEmailMfa}
                    disabled={
                      factorPrefMutation.isPending ||
                      !emailReady ||
                      (otpMailOnlyMethod && prefEmailMfa)
                    }
                    onChange={(e) => persistFactorPrefs({ mfaFactorEmailEnabled: e.target.checked })}
                  />
                  <Button
                    variant="outline-primary"
                    size="sm"
                    disabled={!prefEmailMfa}
                    onClick={() => toggleConfigure('otp')}
                  >
                    {openConfigure === 'otp' ? 'Close' : 'Configure'}
                  </Button>
                </div>
                {!emailReady ? (
                  <Form.Text className="d-block mb-0">Confirm your account email to use OTP mail.</Form.Text>
                ) : otpMailOnlyMethod ? (
                  <Form.Text className="d-block mb-0">Required — your only enabled sign-in method right now.</Form.Text>
                ) : null}

                {openConfigure === 'otp' && prefEmailMfa ? (
                  <div className="mt-3 pt-3 border-top">
                    <p className="fs-sm fw-semibold mb-2">OTP mail delivery</p>
                    <p className="text-muted fs-xs mb-3">
                      Address where you want MFA codes sent. It can differ from your primary account email (
                      <span className="text-break">{user?.email ?? '—'}</span>). Stored in your profile; the live
                      sign-in flow may still use your Appwrite account email until the platform sends codes to this
                      address.
                    </p>
                    <Form
                      className="d-flex flex-wrap align-items-end gap-2"
                      onSubmit={(e) => {
                        e.preventDefault();
                        saveOtpEmailMutation.mutate(mfaOtpEmailDraft);
                      }}
                    >
                      <Form.Group controlId="mfa-otp-delivery-email" className="flex-grow-1" style={{ minWidth: '14rem' }}>
                        <Form.Label className="fs-sm">MFA OTP email</Form.Label>
                        <Form.Control
                          type="email"
                          autoComplete="email"
                          value={mfaOtpEmailDraft}
                          onChange={(e) => setMfaOtpEmailDraft(e.target.value)}
                          placeholder={user?.email ?? 'you@example.com'}
                        />
                      </Form.Group>
                      <Button type="submit" variant="primary" size="sm" disabled={saveOtpEmailMutation.isPending}>
                        {saveOtpEmailMutation.isPending ? <Spinner animation="border" size="sm" /> : 'Save email'}
                      </Button>
                    </Form>
                  </div>
                ) : null}
              </div>
            ) : null}

            {platformTotp ? (
              <div className="border rounded p-3 mb-3">
                <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
                  <Form.Check
                    type="switch"
                    id="profile-mfa-pref-totp"
                    className="mb-0"
                    label="Authenticator app (TOTP)"
                    checked={prefAuthenticatorMfa}
                    disabled={
                      factorPrefMutation.isPending ||
                      !totpReady ||
                      (authenticatorOnlyMethod && prefAuthenticatorMfa)
                    }
                    onChange={(e) => persistFactorPrefs({ mfaFactorAuthenticatorEnabled: e.target.checked })}
                  />
                  <Button
                    variant="outline-primary"
                    size="sm"
                    disabled={!prefAuthenticatorMfa}
                    onClick={() => toggleConfigure('totp')}
                  >
                    {openConfigure === 'totp' ? 'Close' : 'Configure'}
                  </Button>
                </div>
                {!totpReady ? (
                  <Form.Text className="d-block mb-0">
                    Open Configure to scan a QR code and register your authenticator app.
                  </Form.Text>
                ) : !prefAuthenticatorMfa ? (
                  <Form.Text className="d-block mb-0 text-muted">
                    App stays registered; sign-in offers are off while the switch is off.
                  </Form.Text>
                ) : authenticatorOnlyMethod ? (
                  <Form.Text className="d-block mb-0">Required — your only enabled sign-in method right now.</Form.Text>
                ) : null}

                {openConfigure === 'totp' && prefAuthenticatorMfa ? (
                  <div className="mt-3 pt-3 border-top">
                    {mfaUri ? (
                      <div className="bg-light rounded p-3">
                        <p className="fs-sm fw-semibold mb-2">Scan this QR code</p>
                        <p className="fs-xs text-muted mb-3">
                          Open your authenticator app, scan the code, then enter the 6-digit code to confirm.
                        </p>
                        <div
                          className="d-inline-flex p-3 rounded-3 bg-white border mb-3"
                          role="img"
                          aria-label="QR code for authenticator app"
                        >
                          <QRCodeSVG
                            value={mfaUri}
                            size={200}
                            level="M"
                            includeMargin
                            marginSize={2}
                            bgColor="#ffffff"
                            fgColor="#000000"
                          />
                        </div>
                        {mfaSecret ? (
                          <details className="mb-3 fs-xs">
                            <summary className="text-muted user-select-none" style={{ cursor: 'pointer' }}>
                              Can&apos;t scan? Enter the secret manually
                            </summary>
                            <p className="text-muted mt-2 mb-1">Copy this key into your app:</p>
                            <code className="d-block text-break p-2 bg-white border rounded small">{mfaSecret}</code>
                          </details>
                        ) : null}
                        <Form
                          className="d-flex flex-wrap align-items-end gap-2"
                          onSubmit={(e) => {
                            e.preventDefault();
                            setMfaMessage(null);
                            verifyTotpMutation.mutate(mfaOtp.trim());
                          }}
                        >
                          <Form.Group controlId="mfa-otp-verify" className="flex-grow-1" style={{ minWidth: '12rem' }}>
                            <Form.Label className="fs-sm">6-digit code</Form.Label>
                            <Form.Control
                              inputMode="numeric"
                              autoComplete="one-time-code"
                              value={mfaOtp}
                              onChange={(e) => setMfaOtp(e.target.value)}
                              placeholder="000000"
                              required
                            />
                          </Form.Group>
                          <Button type="submit" variant="primary" size="sm" disabled={verifyTotpMutation.isPending}>
                            {verifyTotpMutation.isPending ? <Spinner animation="border" size="sm" /> : 'Verify'}
                          </Button>
                          <Button
                            type="button"
                            variant="link"
                            size="sm"
                            className="text-muted"
                            onClick={() => {
                              setMfaUri(null);
                              setMfaSecret(null);
                              setMfaOtp('');
                            }}
                          >
                            Cancel
                          </Button>
                        </Form>
                      </div>
                    ) : totpReady ? (
                      <div>
                        <p className="fs-sm text-muted mb-2">Authenticator is registered for this account.</p>
                        <Button
                          variant="outline-danger"
                          size="sm"
                          disabled={removeTotpMutation.isPending || (forceMfa && !emailReady)}
                          onClick={() => {
                            if (!window.confirm('Remove the authenticator app from this account?')) return;
                            setMfaMessage(null);
                            removeTotpMutation.mutate();
                          }}
                        >
                          {removeTotpMutation.isPending ? <Spinner animation="border" size="sm" /> : 'Remove authenticator'}
                        </Button>
                        {forceMfa && !emailReady ? (
                          <p className="text-muted fs-xs mt-2 mb-0">
                            Enable email OTP before removing your only other method.
                          </p>
                        ) : null}
                      </div>
                    ) : (
                      <div>
                        <Button
                          variant="primary"
                          size="sm"
                          disabled={startTotpMutation.isPending}
                          onClick={() => {
                            setMfaMessage(null);
                            startTotpMutation.mutate();
                          }}
                        >
                          {startTotpMutation.isPending ? (
                            <>
                              <Spinner animation="border" size="sm" className="me-2" />
                              Preparing…
                            </>
                          ) : (
                            'Start authenticator setup'
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            ) : null}
          </>
        ) : null}

        {canTurnOffMfa ? (
          <div className="mt-2">
            <Button
              variant="outline-danger"
              size="sm"
              disabled={disableMfaMutation.isPending}
              onClick={() => {
                if (!window.confirm('Turn off MFA for this account?')) return;
                setMfaMessage(null);
                disableMfaMutation.mutate();
              }}
            >
              {disableMfaMutation.isPending ? <Spinner animation="border" size="sm" /> : 'Turn off MFA completely'}
            </Button>
          </div>
        ) : null}
      </section>
    </div>
  );
};

export default UserProfileSecurityTab;
