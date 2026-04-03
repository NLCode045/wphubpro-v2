import { useAuth } from '@/domains/auth'
import { AuthenticationFactor } from 'appwrite'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useState, type FormEvent } from 'react'
import { Alert, Button, Form, FormCheck, FormControl, FormLabel, Spinner } from 'react-bootstrap'

type SecondMethod = 'totp' | 'email'

type MfaVerifyFormProps = {
  /** Called after successful verification (e.g. navigate). */
  onSuccess?: () => void
  /** Clears MFA step and session — e.g. back to password form on login. */
  onCancel: () => void | Promise<void>
  cancelLabel?: string
  heading?: string
  description?: string
}

const MfaVerifyForm = ({
  onSuccess,
  onCancel,
  cancelLabel = 'Cancel',
  heading = 'Two-factor authentication',
  description =
    'Complete the second sign-in step using your authenticator app, an email code (sent by your Appwrite server), or a recovery code.',
}: MfaVerifyFormProps) => {
  const {
    completeMfaChallenge,
    sendEmailMfaChallenge,
    completeMfaEmailChallenge,
    listMfaFactors,
  } = useAuth()

  const factorsQuery = useQuery({
    queryKey: ['mfa-factors', 'challenge-ui'],
    queryFn: () => listMfaFactors(),
  })

  const [useRecovery, setUseRecovery] = useState(false)
  const [method, setMethod] = useState<SecondMethod>('totp')
  const [emailChallengeId, setEmailChallengeId] = useState<string | null>(null)
  const [emailSent, setEmailSent] = useState(false)
  const [otp, setOtp] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sendingEmail, setSendingEmail] = useState(false)

  const factors = factorsQuery.data

  useEffect(() => {
    if (!factors) return
    if (factors.totp && !factors.email) setMethod('totp')
    else if (factors.email && !factors.totp) setMethod('email')
    else if (factors.totp && factors.email) setMethod('totp')
    if (!factors.totp && !factors.email && !factors.phone && factors.recoveryCode) {
      setUseRecovery(true)
    }
  }, [factors])

  useEffect(() => {
    setEmailChallengeId(null)
    setEmailSent(false)
    setOtp('')
    setError(null)
  }, [method, useRecovery])

  const handleSendEmail = async () => {
    setError(null)
    setSendingEmail(true)
    try {
      const id = await sendEmailMfaChallenge()
      setEmailChallengeId(id)
      setEmailSent(true)
      setOtp('')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not send email. Check Appwrite SMTP settings.')
    } finally {
      setSendingEmail(false)
    }
  }

  const handleSubmitTotp = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await completeMfaChallenge(otp, useRecovery ? AuthenticationFactor.Recoverycode : undefined)
      setOtp('')
      onSuccess?.()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Verification failed. Try again.')
      setLoading(false)
    }
  }

  const handleSubmitEmailCode = async (e: FormEvent) => {
    e.preventDefault()
    if (!emailChallengeId) {
      setError('Send a verification email first.')
      return
    }
    setError(null)
    setLoading(true)
    try {
      await completeMfaEmailChallenge(emailChallengeId, otp)
      setOtp('')
      onSuccess?.()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid or expired code. Request a new email.')
      setLoading(false)
    }
  }

  if (factorsQuery.isLoading || !factors) {
    return (
      <div className="d-flex align-items-center gap-2 text-muted py-3">
        <Spinner animation="border" size="sm" />
        <span>Loading verification options…</span>
      </div>
    )
  }

  if (factorsQuery.isError) {
    return (
      <Alert variant="danger" className="py-2 fs-sm">
        Could not load MFA options. Try again or sign out and sign back in.
      </Alert>
    )
  }

  const hasAnyFactor = factors.totp || factors.email || factors.phone || factors.recoveryCode
  if (!hasAnyFactor) {
    return (
      <Alert variant="warning" className="py-2 fs-sm">
        No second factors are available on this account. Contact support or adjust MFA in Appwrite if you are locked
        out.
      </Alert>
    )
  }

  const canTotp = factors.totp
  const canEmail = factors.email
  const showMethodChoice = canTotp && canEmail && !useRecovery
  const useEmailFlow = !useRecovery && canEmail && (!canTotp || method === 'email')

  if (useRecovery) {
    return (
      <div>
        <p className="text-muted fs-sm fw-semibold text-uppercase mb-2">{heading}</p>
        <p className="text-muted mb-3">{description}</p>
        {factors.recoveryCode && (factors.totp || factors.email) ? (
          <FormCheck
            type="checkbox"
            id="mfa-recovery-toggle"
            className="mb-3"
            label="Use a recovery code instead"
            checked={useRecovery}
            onChange={(e) => setUseRecovery(e.target.checked)}
          />
        ) : null}
        <Form onSubmit={handleSubmitTotp}>
          {error ? (
            <Alert variant="danger" className="py-2 fs-sm mb-3">
              {error}
            </Alert>
          ) : null}
          <div className="mb-3">
            <FormLabel htmlFor="mfa-otp">
              Recovery code <span className="text-danger">*</span>
            </FormLabel>
            <FormControl
              id="mfa-otp"
              type="text"
              autoComplete="one-time-code"
              placeholder="Enter one recovery code"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
            />
          </div>
          <div className="d-grid gap-2">
            <Button type="submit" className="btn-primary fw-semibold py-2" disabled={loading}>
              {loading ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Verifying…
                </>
              ) : (
                'Verify and continue'
              )}
            </Button>
            <Button
              type="button"
              variant="outline-secondary"
              className="fw-semibold py-2"
              disabled={loading}
              onClick={() => void onCancel()}
            >
              {cancelLabel}
            </Button>
          </div>
        </Form>
      </div>
    )
  }

  return (
    <div>
      <p className="text-muted fs-sm fw-semibold text-uppercase mb-2">{heading}</p>
      <p className="text-muted mb-3">{description}</p>

      {factors.recoveryCode ? (
        <FormCheck
          type="checkbox"
          id="mfa-recovery-toggle"
          className="mb-3"
          label="Use a recovery code instead"
          checked={useRecovery}
          onChange={(e) => {
            setUseRecovery(e.target.checked)
            setError(null)
          }}
        />
      ) : null}

      {factors.phone && !canTotp && !canEmail ? (
        <Alert variant="info" className="py-2 fs-sm mb-3">
          This account uses phone (SMS) as the second factor. SMS MFA is not available in this screen yet.
        </Alert>
      ) : null}

      {showMethodChoice ? (
        <div className="mb-3 d-flex flex-column gap-2">
          <FormCheck
            type="radio"
            name="mfa-method"
            id="mfa-method-totp"
            label="Authenticator app (TOTP)"
            checked={method === 'totp'}
            onChange={() => setMethod('totp')}
          />
          <FormCheck
            type="radio"
            name="mfa-method"
            id="mfa-method-email"
            label="Email verification code"
            checked={method === 'email'}
            onChange={() => setMethod('email')}
          />
        </div>
      ) : null}

      {useEmailFlow ? (
        <div>
          {emailSent ? (
            <Alert variant="success" className="py-2 fs-sm mb-3">
              If SMTP is configured on your Appwrite instance, an email with a verification code was sent. Check inbox
              and spam.
            </Alert>
          ) : (
            <Alert variant="info" className="py-2 fs-sm mb-3">
              Self-hosted Appwrite: configure SMTP under your project (e.g. Console → Project → SMTP). Without it, email
              MFA codes are not delivered.
            </Alert>
          )}

          <div className="d-grid gap-2 mb-3">
            <Button
              type="button"
              variant="outline-primary"
              className="fw-semibold py-2"
              disabled={sendingEmail || loading}
              onClick={() => void handleSendEmail()}
            >
              {sendingEmail ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Sending…
                </>
              ) : emailSent ? (
                'Resend verification email'
              ) : (
                'Send verification email'
              )}
            </Button>
          </div>

          <Form onSubmit={handleSubmitEmailCode}>
            {error ? (
              <Alert variant="danger" className="py-2 fs-sm mb-3">
                {error}
              </Alert>
            ) : null}
            <div className="mb-3">
              <FormLabel htmlFor="mfa-email-otp">
                Code from email <span className="text-danger">*</span>
              </FormLabel>
              <FormControl
                id="mfa-email-otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="Enter the code from the email"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
              />
            </div>
            <div className="d-grid gap-2">
              <Button type="submit" className="btn-primary fw-semibold py-2" disabled={loading || !emailChallengeId}>
                {loading ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Verifying…
                  </>
                ) : (
                  'Verify and continue'
                )}
              </Button>
              <Button
                type="button"
                variant="outline-secondary"
                className="fw-semibold py-2"
                disabled={loading}
                onClick={() => void onCancel()}
              >
                {cancelLabel}
              </Button>
            </div>
          </Form>
        </div>
      ) : canTotp ? (
        <Form onSubmit={handleSubmitTotp}>
          {error ? (
            <Alert variant="danger" className="py-2 fs-sm mb-3">
              {error}
            </Alert>
          ) : null}
          <div className="mb-3">
            <FormLabel htmlFor="mfa-otp">
              Authentication code <span className="text-danger">*</span>
            </FormLabel>
            <FormControl
              id="mfa-otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="6-digit code"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
            />
          </div>
          <div className="d-grid gap-2">
            <Button type="submit" className="btn-primary fw-semibold py-2" disabled={loading}>
              {loading ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Verifying…
                </>
              ) : (
                'Verify and continue'
              )}
            </Button>
            <Button
              type="button"
              variant="outline-secondary"
              className="fw-semibold py-2"
              disabled={loading}
              onClick={() => void onCancel()}
            >
              {cancelLabel}
            </Button>
          </div>
        </Form>
      ) : (
        <Alert variant="warning" className="py-2 fs-sm">
          No supported second factor for this screen (need TOTP or email). Check Appwrite MFA settings.
        </Alert>
      )}
    </div>
  )
}

export default MfaVerifyForm
