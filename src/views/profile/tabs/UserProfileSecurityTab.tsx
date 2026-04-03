import { useAuth, usePublicAuthConfig } from '@/domains/auth';
import { mergeProfilePrefs, parseProfilePrefs, type PrefsRecord } from '@/domains/profile/profilePrefs';
import { account } from '@/services/appwrite';
import { AuthenticatorType } from 'appwrite';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Alert, Button, Form, Spinner } from 'react-bootstrap';

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

  useEffect(() => {
    const p = parseProfilePrefs((user?.prefs ?? null) as PrefsRecord | null);
    setPrefEmailMfa(p.mfaFactorEmailEnabled !== false);
    setPrefAuthenticatorMfa(p.mfaFactorAuthenticatorEnabled !== false);
  }, [user?.prefs]);

  const factorPrefMutation = useMutation({
    mutationFn: async (patch: { mfaFactorEmailEnabled?: boolean; mfaFactorAuthenticatorEnabled?: boolean }) => {
      if (!user) throw new Error('Not signed in.');
      const base = mergeProfilePrefs(user.prefs as PrefsRecord | null, patch);
      await account.updatePrefs(base);
    },
    onSuccess: async () => {
      await refreshUser();
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Could not save preference.';
      setMfaMessage({ variant: 'danger', text: msg });
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
    mutationFn: () => account.updateMFA(true),
    onSuccess: async () => {
      setMfaMessage({ variant: 'success', text: 'MFA is enabled.' });
      await refreshUser();
      await queryClient.invalidateQueries({ queryKey: ['mfa-factors'] });
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof Error
          ? err.message
          : 'Could not enable MFA. Try setting up an authenticator app below first.';
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
      try {
        await account.deleteMfaAuthenticator(AuthenticatorType.Totp);
      } catch {
        /* factor may already be removed */
      }
      await account.updateMFA(false);
    },
    onSuccess: async () => {
      setMfaMessage({ variant: 'success', text: 'MFA has been turned off for this account.' });
      setMfaUri(null);
      setMfaSecret(null);
      setMfaOtp('');
      await refreshUser();
      await queryClient.invalidateQueries({ queryKey: ['mfa-factors'] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Could not disable MFA.';
      setMfaMessage({ variant: 'danger', text: msg });
    },
  });

  const mfaEnabled = Boolean(user && typeof user.mfa === 'boolean' && user.mfa);
  const totpReady = factorsQuery.data?.totp === true;
  const emailReady = factorsQuery.data?.email === true;

  const canTurnOffMfa = mfaEnabled && !forceMfa;

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
          Add an extra step at sign-in. Your administrator can require MFA for everyone and choose which methods are
          available.
        </p>

        {forceMfa ? (
          <Alert variant="info" className="py-2 fs-sm mb-3">
            Your organization requires multi-factor authentication. You cannot turn MFA off while this policy is active.
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
          {emailReady ? <span className="badge badge-soft-info fs-xs">Email OTP available</span> : null}
          {totpReady ? <span className="badge badge-soft-info fs-xs">Authenticator configured</span> : null}
        </div>

        {!mfaEnabled ? (
          <div className="d-flex flex-wrap gap-2 align-items-center mb-3">
            <Button
              variant="primary"
              size="sm"
              disabled={tryEnableMfaMutation.isPending}
              onClick={() => {
                setMfaMessage(null);
                tryEnableMfaMutation.mutate();
              }}>
              {tryEnableMfaMutation.isPending ? <Spinner animation="border" size="sm" /> : 'Try enable MFA'}
            </Button>
            {!forceMfa ? (
              <span className="text-muted fs-xs">
                If this fails, set up an authenticator app below — MFA turns on when you verify the first code.
              </span>
            ) : (
              <span className="text-muted fs-xs">Complete at least one method below. MFA is required.</span>
            )}
          </div>
        ) : null}

        {platformTotp && !mfaUri && (!totpReady || !mfaEnabled) ? (
          <div className="mb-3">
            <Button
              variant="outline-primary"
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
                'Set up authenticator app'
              )}
            </Button>
          </div>
        ) : null}

        {mfaUri ? (
          <div className="border rounded p-3 bg-light mb-3">
            <p className="fs-sm fw-semibold mb-2">Scan this QR code</p>
            <p className="fs-xs text-muted mb-3">
              Open Google Authenticator, 1Password, Authy, or another TOTP app and scan the code below. Then enter the
              6-digit code to confirm.
            </p>
            <div
              className="d-inline-flex p-3 rounded-3 bg-white border mb-3"
              role="img"
              aria-label="QR code to add this account to your authenticator app"
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
                <summary className="text-muted cursor-pointer user-select-none" style={{ cursor: 'pointer' }}>
                  Can&apos;t scan? Enter the secret manually
                </summary>
                <p className="text-muted mt-2 mb-1">Copy this key into your app (spaces optional):</p>
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
              <Form.Group controlId="mfa-otp" className="flex-grow-1" style={{ minWidth: '12rem' }}>
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
                {verifyTotpMutation.isPending ? <Spinner animation="border" size="sm" /> : 'Verify & enable'}
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
        ) : null}

        {mfaEnabled ? (
          <>
            <p className="text-muted fs-xs text-uppercase fw-semibold mb-2">Active MFA options at sign-in</p>
            <p className="text-muted fs-sm mb-3">
              Turn methods on or off for your account. Disabled methods will not be offered after you enter your password.
              At least one method must stay available if your administrator requires MFA.
            </p>
            {platformMail ? (
              <Form.Group className="mb-2">
                <Form.Check
                  type="switch"
                  id="profile-mfa-pref-email"
                  label="OTP mail — sign-in codes sent to your email"
                  checked={prefEmailMfa}
                  disabled={factorPrefMutation.isPending || !emailReady}
                  onChange={(e) => {
                    const v = e.target.checked;
                    setPrefEmailMfa(v);
                    setMfaMessage(null);
                    factorPrefMutation.mutate({ mfaFactorEmailEnabled: v });
                  }}
                />
                {!emailReady ? (
                  <Form.Text className="d-block">Confirm your email with the platform to use this method.</Form.Text>
                ) : null}
              </Form.Group>
            ) : null}
            {platformTotp ? (
              <Form.Group className="mb-3">
                <Form.Check
                  type="switch"
                  id="profile-mfa-pref-totp"
                  label="Authenticator app (TOTP)"
                  checked={prefAuthenticatorMfa}
                  disabled={factorPrefMutation.isPending || !totpReady}
                  onChange={(e) => {
                    const v = e.target.checked;
                    setPrefAuthenticatorMfa(v);
                    setMfaMessage(null);
                    factorPrefMutation.mutate({ mfaFactorAuthenticatorEnabled: v });
                  }}
                />
                {!totpReady ? (
                  <Form.Text className="d-block">Set up an authenticator above to use this at sign-in.</Form.Text>
                ) : null}
              </Form.Group>
            ) : null}
          </>
        ) : null}

        {totpReady && mfaEnabled ? (
          <div className="mb-3">
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
              {removeTotpMutation.isPending ? <Spinner animation="border" size="sm" /> : 'Remove authenticator app'}
            </Button>
            {forceMfa && !emailReady ? (
              <p className="text-muted fs-xs mt-2 mb-0">
                Add email OTP as a backup before removing your only MFA method.
              </p>
            ) : null}
          </div>
        ) : null}

        {canTurnOffMfa ? (
          <div className="mt-2">
            <Button
              variant="outline-danger"
              size="sm"
              disabled={disableMfaMutation.isPending}
              onClick={() => {
                if (!window.confirm('Turn off MFA for this account? You can enable it again later.')) return;
                setMfaMessage(null);
                disableMfaMutation.mutate();
              }}
            >
              {disableMfaMutation.isPending ? <Spinner animation="border" size="sm" /> : 'Turn off MFA'}
            </Button>
          </div>
        ) : null}
      </section>
    </div>
  );
};

export default UserProfileSecurityTab;
