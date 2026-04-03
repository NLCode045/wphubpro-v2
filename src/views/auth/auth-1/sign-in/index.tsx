import AppLogo from '@/components/AppLogo'
import { ROUTE_PATHS } from '@/config/routePaths'
import { useAuth, usePublicAuthConfig } from '@/domains/auth'
import { fetchLoginMethods, type LoginMethodsResult } from '@/domains/auth/publicAuthConfig'
import { currentYear } from '@/helpers'
import { account } from '@/services/appwrite'
import { useEffect, useState, type FormEvent } from 'react'
import { FaEnvelope, FaGithub, FaMobileScreenButton } from 'react-icons/fa6'
import { Link, useNavigate } from 'react-router'
import { Alert, Button, Card, Col, Container, Form, FormControl, FormLabel, Row, Spinner } from 'react-bootstrap'

/** Sign-in with email + password; second step only when Appwrite requires MFA (user has MFA enabled). */
type PasswordSignInFlow =
  | { step: 'password' }
  | { step: 'pick_second'; mfaPending: boolean }
  | { step: 'email_verification'; mode: 'token'; userId: string }
  | { step: 'email_verification'; mode: 'mfa'; challengeId: string }
  | { step: 'totp'; challengeId: string }

const SignInPage = () => {
  const {
    login,
    refreshUser,
    beginTotpMfaChallenge,
    beginEmailMfaChallenge,
    completeMfaChallengeLogin,
    cancelMfaLogin,
    loginWithGitHub,
    verifyLoginEmailOtp,
  } = useAuth()
  const navigate = useNavigate()
  const { data: publicAuth, isLoading: publicAuthLoading, isError: publicAuthError } = usePublicAuthConfig()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [pwdFlow, setPwdFlow] = useState<PasswordSignInFlow>({ step: 'password' })

  const [pickSecondFactors, setPickSecondFactors] = useState<{ totp: boolean; email: boolean } | null>(null)
  const [pickSecondPrefs, setPickSecondPrefs] = useState<LoginMethodsResult | null>(null)
  const [pickSecondLoading, setPickSecondLoading] = useState(false)
  /** Which MFA card is starting a challenge (password step still uses `loading`). */
  const [pickSecondAction, setPickSecondAction] = useState<'email' | 'totp' | null>(null)

  useEffect(() => {
    if (pwdFlow.step !== 'pick_second') {
      setPickSecondFactors(null)
      setPickSecondPrefs(null)
      setPickSecondLoading(false)
      return
    }
    const em = email.trim()
    if (!em) {
      setPickSecondFactors(null)
      setPickSecondPrefs(null)
      return
    }
    let cancelled = false
    setPickSecondLoading(true)
    ;(async () => {
      try {
        const lm = await fetchLoginMethods(em)
        let totp = lm.mfaFactorTotpRegistered
        let emailFactor = lm.mfaFactorEmailRegistered
        if (totp === null || emailFactor === null) {
          try {
            const factors = await account.listMfaFactors()
            if (totp === null) totp = factors.totp
            if (emailFactor === null) emailFactor = factors.email
          } catch {
            if (totp === null) totp = true
            if (emailFactor === null) emailFactor = true
          }
        }
        if (!cancelled) {
          setPickSecondFactors({ totp: Boolean(totp), email: Boolean(emailFactor) })
          setPickSecondPrefs(lm)
        }
      } catch {
        if (!cancelled) {
          setPickSecondFactors({ email: true, totp: true })
          setPickSecondPrefs({
            mfaFactorEmailEnabled: true,
            mfaFactorAuthenticatorEnabled: true,
            mfaFactorEmailRegistered: null,
            mfaFactorTotpRegistered: null,
          })
        }
      } finally {
        if (!cancelled) setPickSecondLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [pwdFlow.step, email])

  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const { mfaPending } = await login(email, password)
      setVerificationCode('')
      if (!mfaPending) {
        await refreshUser()
        navigate(ROUTE_PATHS.DASHBOARD, { replace: true })
        return
      }
      setPwdFlow({ step: 'pick_second', mfaPending })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid email or password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handlePickEmail = async () => {
    if (pwdFlow.step !== 'pick_second') return
    setError(null)
    setPickSecondAction('email')
    setVerificationCode('')
    try {
      const challengeId = await beginEmailMfaChallenge()
      setPwdFlow({ step: 'email_verification', mode: 'mfa', challengeId })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not send verification email.')
    } finally {
      setPickSecondAction(null)
    }
  }

  const handlePickAuthenticator = async () => {
    setError(null)
    setPickSecondAction('totp')
    setVerificationCode('')
    try {
      const challengeId = await beginTotpMfaChallenge()
      setPwdFlow({ step: 'totp', challengeId })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not start authenticator verification.')
    } finally {
      setPickSecondAction(null)
    }
  }

  const handleVerifySecondFactor = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      if (pwdFlow.step === 'email_verification') {
        if (pwdFlow.mode === 'token') {
          await verifyLoginEmailOtp(pwdFlow.userId, verificationCode)
        } else {
          await completeMfaChallengeLogin(pwdFlow.challengeId, verificationCode)
        }
      } else if (pwdFlow.step === 'totp') {
        await completeMfaChallengeLogin(pwdFlow.challengeId, verificationCode)
      }
      await refreshUser()
      navigate(ROUTE_PATHS.DASHBOARD, { replace: true })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid or expired code.')
    } finally {
      setLoading(false)
    }
  }

  const leavePickSecond = async () => {
    await cancelMfaLogin()
    setPwdFlow({ step: 'password' })
    setVerificationCode('')
    setError(null)
  }

  const cancelCodeStep = async () => {
    if (pwdFlow.step === 'email_verification' && pwdFlow.mode === 'token') {
      setPwdFlow({ step: 'password' })
      setVerificationCode('')
      setError(null)
      return
    }
    await cancelMfaLogin()
    setPwdFlow({ step: 'password' })
    setVerificationCode('')
    setError(null)
  }

  const platformMail = publicAuth?.mfaOtpMailEnabled !== false && !publicAuthError
  const platformTotp = publicAuth?.mfaAuthenticatorEnabled !== false && !publicAuthError
  /** True unless admin explicitly disabled email MFA (allows fallback when config fetch failed). */
  const platformAllowsEmailMfa = publicAuth?.mfaOtpMailEnabled !== false
  const pickSecondMfaPending = pwdFlow.step === 'pick_second' ? pwdFlow.mfaPending : false
  const showEmailMfaChoice =
    platformMail &&
    pickSecondFactors?.email === true &&
    pickSecondPrefs?.mfaFactorEmailEnabled !== false
  const showTotpMfaChoice =
    platformTotp &&
    pickSecondFactors?.totp === true &&
    pickSecondPrefs?.mfaFactorAuthenticatorEnabled !== false
  /** No card matched server/prefs; still offer email OTP when MFA is required (Appwrite almost always has email factor). */
  const pickSecondEmailOtpFallback =
    pickSecondMfaPending &&
    !pickSecondLoading &&
    !showEmailMfaChoice &&
    !showTotpMfaChoice &&
    platformAllowsEmailMfa
  /** Second step only after password when MFA is required (pick_second). */
  const showEmailSecondStep =
    !pickSecondLoading && (showEmailMfaChoice || pickSecondEmailOtpFallback)
  const showTotpSecondStep = !pickSecondLoading && showTotpMfaChoice
  const pickSecondCardBusy = pickSecondAction !== null
  const pickSecondMisconfigured =
    pwdFlow.step === 'pick_second' &&
    pickSecondMfaPending &&
    !pickSecondLoading &&
    !showEmailSecondStep &&
    !showTotpSecondStep

  const showPasswordStep = pwdFlow.step === 'password'
  const showPickSecond = pwdFlow.step === 'pick_second'
  const showEmailCodeStep = pwdFlow.step === 'email_verification'
  const showTotpStep = pwdFlow.step === 'totp'

  const brandLine = (() => {
    if (pwdFlow.step === 'pick_second') {
      return 'Choose how you want to verify — pick a method you enabled in your security settings.'
    }
    if (pwdFlow.step === 'email_verification') {
      return `Enter the code we sent to ${email.trim() || 'your email'}.`
    }
    if (pwdFlow.step === 'totp') {
      return 'Enter the 6-digit code from your authenticator app.'
    }
    return "Let's get you signed in. Enter your email and password to continue."
  })()

  return (
    <div className="auth-box overflow-hidden align-items-center d-flex" style={{ minHeight: '100vh' }}>
      <Container>
        <Row className="justify-content-center">
          <Col xxl={4} md={6} sm={8}>
            <Card className="p-4">
              <div className="position-absolute top-0 end-0" style={{ width: 180 }}>
                <svg style={{ opacity: '0.075', width: '100%', height: 'auto' }} width={600} height={560} viewBox="0 0 600 560" fill="none" xmlns="http://www.w3.org/2000/svg"><g clipPath="url(#clip0_948_1464)"><mask id="mask0_948_1464" style={{ maskType: 'luminance' }} maskUnits="userSpaceOnUse" x={0} y={0} width={600} height={1200}><path d="M0 0L0 1200H600L600 0H0Z" fill="white" /></mask><g mask="url(#mask0_948_1464)"><path d="M537.448 166.697L569.994 170.892L550.644 189.578L537.448 166.697Z" fill="#FF4C3E" /></g><mask id="mask1_948_1464" style={{ maskType: 'luminance' }} maskUnits="userSpaceOnUse" x={0} y={0} width={600} height={1200}><path d="M0 0L0 1200H600L600 0H0Z" fill="white" /></mask><g mask="url(#mask1_948_1464)"><path d="M364.093 327.517L332.306 359.304C321.885 369.725 304.989 369.725 294.568 359.304L262.781 327.517C252.36 317.096 252.36 300.2 262.781 289.779L294.568 257.992C304.989 247.571 321.885 247.571 332.306 257.992L364.093 289.779C374.514 300.2 374.514 317.096 364.093 327.517Z" stroke="#089df1" strokeWidth={2} strokeMiterlimit={10} /><path d="M377.923 101.019L315.106 163.836C299.517 179.425 274.242 179.425 258.653 163.836L195.836 101.019C180.247 85.4301 180.247 60.1551 195.836 44.5661L258.653 -18.251C274.242 -33.84 299.517 -33.84 315.106 -18.251L377.923 44.5661C393.512 60.1551 393.512 85.4301 377.923 101.019Z" stroke="#089df1" strokeWidth={2} strokeMiterlimit={10} /><path d="M696.956 -50.1542L650.648 -3.84605C635.059 11.743 609.784 11.743 594.195 -3.84605L547.887 -50.1542C532.298 -65.7432 532.298 -91.0182 547.887 -106.607L594.195 -152.915C609.784 -168.504 635.059 -168.504 650.648 -152.915L696.956 -106.607C712.545 -91.0172 712.545 -65.7432 696.956 -50.1542Z" stroke="#089df1" strokeWidth={2} strokeMiterlimit={10} /><path d="M758.493 103.825L712.185 150.133C696.596 165.722 671.321 165.722 655.733 150.133L609.425 103.825C593.836 88.2359 593.836 62.9608 609.425 47.3718L655.733 1.06386C671.322 -14.5251 696.597 -14.5251 712.185 1.06386L758.493 47.3718C774.082 62.9608 774.082 88.2359 758.493 103.825Z" stroke="#089df1" strokeWidth={2} strokeMiterlimit={10} /><path d="M674.716 80.202L501.67 253.248C486.081 268.837 460.806 268.837 445.217 253.248L272.171 80.202C256.582 64.613 256.582 39.338 272.171 23.749L445.217 -149.297C460.806 -164.886 486.081 -164.886 501.67 -149.297L674.716 23.75C690.305 39.339 690.305 64.613 674.716 80.202Z" stroke="#089df1" strokeWidth={2} strokeMiterlimit={10} /><path d="M579.394 334.046L523.831 389.609C508.242 405.198 482.967 405.198 467.378 389.609L411.815 334.046C396.226 318.457 396.226 293.182 411.815 277.593L467.378 222.03C482.967 206.441 508.242 206.441 523.831 222.03L579.394 277.593C594.983 293.182 594.983 318.457 579.394 334.046Z" stroke="#089df1" strokeWidth={2} strokeMiterlimit={10} /><path d="M185.618 87.2381L158.648 114.208C146.305 126.551 126.293 126.551 113.95 114.208L86.9799 87.2381C74.6369 74.8951 74.6369 54.883 86.9799 42.539L113.95 15.569C126.293 3.22605 146.305 3.22605 158.648 15.569L185.618 42.539C197.961 54.882 197.961 74.8941 185.618 87.2381Z" stroke="#089df1" strokeWidth={2} strokeMiterlimit={10} /><path d="M249.319 23.767L228.859 44.227C221.817 51.269 210.4 51.269 203.358 44.227L182.898 23.767C175.856 16.725 175.856 5.30798 182.898 -1.73402L203.358 -22.194C210.4 -29.236 221.817 -29.236 228.859 -22.194L249.319 -1.73402C256.361 5.30798 256.361 16.725 249.319 23.767Z" stroke="#089df1" strokeWidth={2} strokeMiterlimit={10} /><path d="M375.3 217.828L354.84 238.288C347.798 245.33 336.381 245.33 329.339 238.288L308.879 217.828C301.837 210.786 301.837 199.369 308.879 192.327L329.339 171.867C336.381 164.825 347.798 164.825 354.84 171.867L375.3 192.327C382.342 199.369 382.342 210.786 375.3 217.828Z" stroke="#089df1" strokeWidth={2} strokeMiterlimit={10} /><path d="M262.326 229.367L255.702 235.991C252.281 239.412 246.734 239.412 243.313 235.991L236.689 229.367C233.268 225.946 233.268 220.399 236.689 216.978L243.313 210.354C246.734 206.933 252.281 206.933 255.702 210.354L262.326 216.978C265.747 220.399 265.747 225.946 262.326 229.367Z" stroke="#089df1" strokeWidth={2} strokeMiterlimit={10} /><path d="M403.998 311.555L372.211 343.342C361.79 353.763 344.894 353.763 334.473 343.342L302.686 311.555C292.265 301.134 292.265 284.238 302.686 273.817L334.473 242.03C344.894 231.609 361.79 231.609 372.211 242.03L403.998 273.817C414.419 284.238 414.419 301.134 403.998 311.555Z" fill="#089df1" /><path d="M417.828 85.0572L355.011 147.874C339.422 163.463 314.147 163.463 298.558 147.874L235.741 85.0572C220.152 69.4682 220.152 44.1931 235.741 28.6051L298.558 -34.2119C314.147 -49.8009 339.422 -49.8009 355.011 -34.2119L417.828 28.6051C433.417 44.1931 433.417 69.4682 417.828 85.0572Z" fill="#7b70ef" /><path d="M714.621 64.24L541.575 237.286C525.986 252.875 500.711 252.875 485.122 237.286L312.076 64.24C296.487 48.651 296.487 23.376 312.076 7.787L485.122 -165.259C500.711 -180.848 525.986 -180.848 541.575 -165.259L714.621 7.787C730.21 23.377 730.21 48.651 714.621 64.24Z" fill="#f9bf59" /><path d="M619.299 318.084L563.736 373.647C548.147 389.236 522.872 389.236 507.283 373.647L451.72 318.084C436.131 302.495 436.131 277.22 451.72 261.631L507.283 206.068C522.872 190.479 548.147 190.479 563.736 206.068L619.299 261.631C634.888 277.221 634.888 302.495 619.299 318.084Z" fill="#089df1" /><path d="M225.523 71.276L198.553 98.2459C186.21 110.589 166.198 110.589 153.854 98.2459L126.884 71.276C114.541 58.933 114.541 38.921 126.884 26.578L153.854 -0.392014C166.197 -12.735 186.209 -12.735 198.553 -0.392014L225.523 26.578C237.866 38.92 237.866 58.932 225.523 71.276Z" fill="#f7577e" /><path d="M289.224 7.80493L268.764 28.2649C261.722 35.3069 250.305 35.3069 243.263 28.2649L222.803 7.80493C215.761 0.762926 215.761 -10.6542 222.803 -17.6962L243.263 -38.1561C250.305 -45.1981 261.722 -45.1981 268.764 -38.1561L289.224 -17.6962C296.266 -10.6542 296.266 0.762926 289.224 7.80493Z" fill="#f7577e" /><path d="M415.205 201.866L394.745 222.326C387.703 229.368 376.286 229.368 369.244 222.326L348.784 201.866C341.742 194.824 341.742 183.407 348.784 176.365L369.244 155.905C376.286 148.863 387.703 148.863 394.745 155.905L415.205 176.365C422.247 183.407 422.247 194.824 415.205 201.866Z" fill="#f7577e" /><path d="M302.231 213.405L295.607 220.029C292.186 223.45 286.639 223.45 283.218 220.029L276.594 213.405C273.173 209.984 273.173 204.437 276.594 201.016L283.218 194.392C286.639 190.971 292.186 190.971 295.607 194.392L302.231 201.016C305.652 204.437 305.652 209.984 302.231 213.405Z" fill="#f7577e" /></g></g><defs><clipPath id="clip0_948_1464"><rect width={560} height={600} fill="white" transform="matrix(0 -1 1 0 0 560)" /></clipPath></defs></svg>
              </div>

              <div className="auth-brand text-center mb-4">
                <AppLogo />
                <p className="text-muted w-lg-75 mt-3 mx-auto">{brandLine}</p>
              </div>

              {publicAuthLoading ? (
                <div className="d-flex align-items-center justify-content-center gap-2 text-muted py-4">
                  <Spinner animation="border" size="sm" />
                  Loading…
                </div>
              ) : null}

              {!publicAuthLoading && publicAuthError ? (
                <Alert variant="warning" className="py-2 fs-sm mb-3">
                  Could not load sign-in options. You can still try email and password.
                </Alert>
              ) : null}

              {!publicAuthLoading && showPasswordStep && (
                <Form onSubmit={handlePasswordSubmit}>
                  {error ? (
                    <Alert variant="danger" className="mb-3 py-2">
                      {error}
                    </Alert>
                  ) : null}

                  <div className="mb-3 form-group">
                    <FormLabel>
                      Email address <span className="text-danger">*</span>
                    </FormLabel>
                    <FormControl
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="mb-3 form-group">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <FormLabel className="mb-0">
                        Password <span className="text-danger">*</span>
                      </FormLabel>
                      <Link
                        to={ROUTE_PATHS.FORGOT_PASSWORD}
                        className="text-decoration-underline link-offset-3 text-muted small">
                        Forgot password?
                      </Link>
                    </div>
                    <FormControl
                      type="password"
                      autoComplete="current-password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>

                  <div className="d-grid mb-2">
                    <Button type="submit" className="btn-primary fw-semibold py-2" disabled={loading}>
                      {loading ? (
                        <>
                          <Spinner animation="border" size="sm" className="me-2" />
                          Verifying…
                        </>
                      ) : (
                        'Continue'
                      )}
                    </Button>
                  </div>

                  <div className="d-grid mb-3">
                    <Button
                      type="button"
                      variant="outline-secondary"
                      className="fw-semibold py-2 d-inline-flex align-items-center justify-content-center gap-2"
                      onClick={() => loginWithGitHub()}>
                      <FaGithub size={18} />
                      Continue with GitHub
                    </Button>
                  </div>
                </Form>
              )}

              {!publicAuthLoading && showPickSecond && (
                <div>
                  {error ? (
                    <Alert variant="danger" className="mb-3 py-2">
                      {error}
                    </Alert>
                  ) : null}
                  <p className="text-muted fs-sm mb-3">
                    Your password was accepted. Select one of your enabled verification methods below.
                  </p>
                  {pickSecondLoading ? (
                    <div className="d-flex align-items-center gap-2 text-muted fs-sm mb-3">
                      <Spinner animation="border" size="sm" />
                      Loading your sign-in options…
                    </div>
                  ) : null}
                  {pickSecondMisconfigured ? (
                    <Alert variant="danger" className="py-2 fs-sm mb-3">
                      No MFA method is available for your account. Contact support or update your security settings in
                      your profile.
                    </Alert>
                  ) : null}
                  <Row className="g-3 mb-3">
                    {showEmailSecondStep ? (
                      <Col xs={12} md={showTotpSecondStep ? 6 : 12}>
                        <Card
                          className={`h-100 border border-light-subtle shadow-sm user-select-none ${
                            pickSecondCardBusy && pickSecondAction !== 'email' ? 'opacity-50' : ''
                          }`}
                          role="button"
                          tabIndex={pickSecondCardBusy || pickSecondLoading ? -1 : 0}
                          onClick={() => {
                            if (pickSecondCardBusy || pickSecondLoading) return
                            void handlePickEmail()
                          }}
                          onKeyDown={(e) => {
                            if (pickSecondCardBusy || pickSecondLoading) return
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              void handlePickEmail()
                            }
                          }}
                          style={{
                            cursor: pickSecondCardBusy || pickSecondLoading ? 'default' : 'pointer',
                          }}
                          aria-busy={pickSecondAction === 'email'}
                          aria-label="Sign in with email verification code">
                          <Card.Body className="d-flex flex-column align-items-start gap-2 p-3 p-md-4">
                            <div className="rounded-3 bg-primary bg-opacity-10 text-primary p-3">
                              <FaEnvelope size={22} aria-hidden />
                            </div>
                            <Card.Title as="h6" className="mb-0 fs-base fw-semibold">
                              Email code
                            </Card.Title>
                            <Card.Text className="text-muted small mb-0">
                              Receive a one-time code in your inbox. Use the address on your account.
                              {pickSecondEmailOtpFallback ? (
                                <span className="d-block mt-2 fs-xs fst-italic">
                                  Offered by default when your saved MFA methods could not be confirmed.
                                </span>
                              ) : null}
                            </Card.Text>
                            {pickSecondAction === 'email' ? (
                              <div className="d-flex align-items-center gap-2 text-primary fs-sm mt-1">
                                <Spinner animation="border" size="sm" />
                                Sending code…
                              </div>
                            ) : (
                              <span className="text-primary fs-sm fw-semibold mt-1">Continue with email →</span>
                            )}
                          </Card.Body>
                        </Card>
                      </Col>
                    ) : null}
                    {showTotpSecondStep ? (
                      <Col xs={12} md={showEmailSecondStep ? 6 : 12}>
                        <Card
                          className={`h-100 border border-light-subtle shadow-sm user-select-none ${
                            pickSecondCardBusy && pickSecondAction !== 'totp' ? 'opacity-50' : ''
                          }`}
                          role="button"
                          tabIndex={pickSecondCardBusy || pickSecondLoading ? -1 : 0}
                          onClick={() => {
                            if (pickSecondCardBusy || pickSecondLoading) return
                            void handlePickAuthenticator()
                          }}
                          onKeyDown={(e) => {
                            if (pickSecondCardBusy || pickSecondLoading) return
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              void handlePickAuthenticator()
                            }
                          }}
                          style={{
                            cursor: pickSecondCardBusy || pickSecondLoading ? 'default' : 'pointer',
                          }}
                          aria-busy={pickSecondAction === 'totp'}
                          aria-label="Sign in with authenticator app">
                          <Card.Body className="d-flex flex-column align-items-start gap-2 p-3 p-md-4">
                            <div className="rounded-3 bg-secondary bg-opacity-10 text-body-secondary p-3">
                              <FaMobileScreenButton size={22} aria-hidden />
                            </div>
                            <Card.Title as="h6" className="mb-0 fs-base fw-semibold">
                              Authenticator app
                            </Card.Title>
                            <Card.Text className="text-muted small mb-0">
                              Open your authenticator app and enter the 6-digit code for this account.
                            </Card.Text>
                            {pickSecondAction === 'totp' ? (
                              <div className="d-flex align-items-center gap-2 text-primary fs-sm mt-1">
                                <Spinner animation="border" size="sm" />
                                Preparing…
                              </div>
                            ) : (
                              <span className="text-primary fs-sm fw-semibold mt-1">Continue with app →</span>
                            )}
                          </Card.Body>
                        </Card>
                      </Col>
                    ) : null}
                  </Row>
                  <div className="text-center">
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      className="text-muted"
                      disabled={pickSecondCardBusy}
                      onClick={() => void leavePickSecond()}>
                      Back to email and password
                    </Button>
                  </div>
                </div>
              )}

              {!publicAuthLoading && (showEmailCodeStep || showTotpStep) && (
                <Form onSubmit={handleVerifySecondFactor}>
                  {error ? (
                    <Alert variant="danger" className="mb-3 py-2">
                      {error}
                    </Alert>
                  ) : null}
                  {showTotpStep ? (
                    <p className="text-muted fs-sm mb-3">
                      Open your authenticator app and enter the code for{' '}
                      <strong>{email.trim() || 'your account'}</strong>.
                    </p>
                  ) : (
                    <p className="text-muted fs-sm mb-3">
                      Check your inbox (and spam) for a message from us with your verification code.
                    </p>
                  )}
                  <div className="mb-3 form-group">
                    <FormLabel>{showTotpStep ? 'Authenticator code' : 'Verification code'}</FormLabel>
                    <FormControl
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder="6-digit code"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                  <div className="d-grid gap-2 mb-3">
                    <Button type="submit" className="btn-primary fw-semibold py-2" disabled={loading}>
                      {loading ? (
                        <>
                          <Spinner animation="border" size="sm" className="me-2" />
                          Verifying…
                        </>
                      ) : (
                        'Verify and sign in'
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline-secondary"
                      size="sm"
                      disabled={loading}
                      onClick={() => void cancelCodeStep()}>
                      Cancel
                    </Button>
                  </div>
                </Form>
              )}

              <p className="text-muted text-center mt-4 mb-0">
                New here?{' '}
                <Link to={ROUTE_PATHS.REGISTER} className="text-decoration-underline link-offset-3 fw-semibold">
                  Create an account
                </Link>
              </p>
            </Card>

            <p className="text-center text-muted mt-4 mb-0">
              © {currentYear} WPHub.Pro
            </p>
          </Col>
        </Row>
      </Container>
    </div>
  )
}

export default SignInPage
