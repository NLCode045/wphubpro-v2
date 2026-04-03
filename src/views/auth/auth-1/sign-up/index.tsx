import AppLogo from '@/components/AppLogo'
import PasswordInputWithStrength from '@/components/PasswordInputWithStrength'
import { ROUTE_PATHS } from '@/config/routePaths'
import { useAuth } from '@/domains/auth'
import { currentYear } from '@/helpers'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { Alert, Button, Card, Col, Container, Form, FormControl, FormLabel, Row, Spinner } from 'react-bootstrap'

const SignUpPage = () => {
  const { register } = useAuth()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [agreement, setAgreement] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.')
      return
    }
    if (!agreement) {
      setError('Please agree to the terms to continue.')
      return
    }
    setError(null)
    setLoading(true)
    try {
      await register(name, email, password)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not create your account.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-box overflow-hidden align-items-center d-flex" style={{ minHeight: '100vh' }}>
      <Container>
        <Row className="justify-content-center">
          <Col xxl={4} md={6} sm={8}>
            <Card className="p-4">
              <div className="position-absolute top-0 end-0" style={{ width: 180 }}>
                <svg style={{ opacity: '0.075', width: '100%', height: 'auto' }} width={600} height={560} viewBox="0 0 600 560" fill="none" xmlns="http://www.w3.org/2000/svg"><g clipPath="url(#clip0_948_1464)"><mask id="mask0_948_1464" style={{ maskType: 'luminance' }} maskUnits="userSpaceOnUse" x={0} y={0} width={600} height={1200}><path d="M0 0L0 1200H600L600 0H0Z" fill="white" /></mask><g mask="url(#mask0_948_1464)"><path d="M537.448 166.697L569.994 170.892L550.644 189.578L537.448 166.697Z" fill="#FF4C3E" /></g></g></svg>
              </div>
              <div className="auth-brand text-center mb-4">
                <AppLogo />
                <p className="text-muted w-lg-75 mt-3 mx-auto">Create your account by entering your details below.</p>
              </div>

              <div>
                {error && (
                  <Alert variant="danger" className="mb-3 py-2">
                    {error}
                  </Alert>
                )}

                <Form onSubmit={handlePasswordSubmit}>
                  <div className="mb-3 form-group">
                    <FormLabel>
                      Name <span className="text-danger">*</span>
                    </FormLabel>
                    <FormControl
                      type="text"
                      autoComplete="name"
                      placeholder="Your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>

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

                  <div className="mb-3">
                    <PasswordInputWithStrength
                      id="password"
                      label="Password"
                      name="password"
                      password={password}
                      setPassword={setPassword}
                      placeholder="••••••••"
                    />
                  </div>

                  <div className="mb-3">
                    <div className="form-check">
                      <input
                        className="form-check-input form-check-input-light fs-14"
                        type="checkbox"
                        id="termAndPolicy"
                        checked={agreement}
                        onChange={() => setAgreement((v) => !v)}
                      />
                      <label className="form-check-label" htmlFor="termAndPolicy">
                        I agree to the terms and policy
                      </label>
                    </div>
                  </div>

                  <div className="d-grid">
                    <Button type="submit" className="btn btn-primary fw-semibold py-2" disabled={loading}>
                      {loading ? (
                        <>
                          <Spinner animation="border" size="sm" className="me-2" />
                          Creating account…
                        </>
                      ) : (
                        'Create Account'
                      )}
                    </Button>
                  </div>
                </Form>
              </div>

              <p className="text-muted text-center mt-4 mb-0">
                Already have an account?{' '}
                <Link to={ROUTE_PATHS.LOGIN} className="text-decoration-underline link-offset-3 fw-semibold">
                  Sign in
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

export default SignUpPage
