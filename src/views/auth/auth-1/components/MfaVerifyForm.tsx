import { useAuth } from '@/domains/auth'
import { AuthenticationFactor } from 'appwrite'
import { useState, type FormEvent } from 'react'
import { Alert, Button, Form, FormCheck, FormControl, FormLabel, Spinner } from 'react-bootstrap'

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
  description = 'Enter the code from your authenticator app. If you enabled email or SMS MFA, choose the matching option below.',
}: MfaVerifyFormProps) => {
  const { completeMfaChallenge } = useAuth()
  const [otp, setOtp] = useState('')
  const [useRecovery, setUseRecovery] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
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

  return (
    <div>
      <p className="text-muted fs-sm fw-semibold text-uppercase mb-2">{heading}</p>
      <p className="text-muted mb-3">{description}</p>
      <Form onSubmit={handleSubmit}>
        {error ? (
          <Alert variant="danger" className="py-2 fs-sm mb-3">
            {error}
          </Alert>
        ) : null}
        <FormCheck
          type="checkbox"
          id="mfa-recovery-toggle"
          className="mb-3"
          label="Use a recovery code instead"
          checked={useRecovery}
          onChange={(e) => {
            setUseRecovery(e.target.checked)
            setOtp('')
            setError(null)
          }}
        />
        <div className="mb-3">
          <FormLabel htmlFor="mfa-otp">
            {useRecovery ? 'Recovery code' : 'Authentication code'}{' '}
            <span className="text-danger">*</span>
          </FormLabel>
          <FormControl
            id="mfa-otp"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder={useRecovery ? 'Enter one recovery code' : '6-digit code'}
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

export default MfaVerifyForm
