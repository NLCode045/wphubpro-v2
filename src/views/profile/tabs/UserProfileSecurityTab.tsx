import { useAuth } from '@/domains/auth';
import { account } from '@/services/appwrite';
import { AuthenticatorType } from 'appwrite';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert, Button, Form, Spinner } from 'react-bootstrap';

const UserProfileSecurityTab = () => {
  const { user, refreshUser } = useAuth();
  const queryClient = useQueryClient();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwMessage, setPwMessage] = useState<{ variant: 'success' | 'danger'; text: string } | null>(null);

  const [mfaUri, setMfaUri] = useState<string | null>(null);
  const [mfaSecret, setMfaSecret] = useState<string | null>(null);
  const [mfaOtp, setMfaOtp] = useState('');
  const [mfaMessage, setMfaMessage] = useState<{ variant: 'success' | 'danger'; text: string } | null>(null);

  const factorsQuery = useQuery({
    queryKey: ['mfa-factors'],
    queryFn: () => account.listMfaFactors(),
    enabled: Boolean(user),
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
          Add a time-based one-time password (TOTP) app such as Google Authenticator or 1Password for an extra sign-in step.
        </p>

        {factorsQuery.isLoading ? (
          <Spinner animation="border" size="sm" />
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
          {totpReady ? (
            <span className="badge badge-soft-info fs-xs">TOTP configured</span>
          ) : (
            <span className="text-muted fs-xs">TOTP not configured</span>
          )}
        </div>

        {!mfaEnabled && !mfaUri ? (
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
        ) : null}

        {mfaUri && mfaSecret ? (
          <div className="border rounded p-3 bg-light">
            <p className="fs-sm fw-semibold mb-2">Scan or enter the secret</p>
            <p className="fs-xs text-muted mb-2">
              In your authenticator app, add an account and scan the QR code if your app supports it, or enter the secret manually.
            </p>
            <p className="fs-xxs text-break mb-2">
              <span className="text-muted">otpauth URI · </span>
              <code>{mfaUri}</code>
            </p>
            <p className="fs-xxs text-break mb-3">
              <span className="text-muted">Secret · </span>
              <code>{mfaSecret}</code>
            </p>
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
          <div className="mt-3">
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
              {disableMfaMutation.isPending ? <Spinner animation="border" size="sm" /> : 'Disable MFA'}
            </Button>
          </div>
        ) : null}
      </section>
    </div>
  );
};

export default UserProfileSecurityTab;
