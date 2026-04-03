import AppLogo from '@/components/AppLogo'
import Loader from '@/components/Loader'
import { ROUTE_PATHS } from '@/config/routePaths'
import { useAuth } from '@/domains/auth'
import { currentYear } from '@/helpers'
import MfaVerifyForm from '@/views/auth/auth-1/components/MfaVerifyForm'
import { Navigate, useNavigate } from 'react-router'
import { Card, Col, Container, Row } from 'react-bootstrap'

/** Completes Appwrite MFA after email/password, OAuth, or password recovery. */
const MfaChallengePage = () => {
  const navigate = useNavigate()
  const { user, mfaPending, isLoading, logout } = useAuth()

  if (isLoading) {
    return <Loader height="100vh" />
  }

  if (user) {
    return <Navigate to={ROUTE_PATHS.DASHBOARD} replace />
  }

  if (!mfaPending) {
    return <Navigate to={ROUTE_PATHS.LOGIN} replace />
  }

  return (
    <div className="auth-box overflow-hidden align-items-center d-flex" style={{ minHeight: '100vh' }}>
      <Container>
        <Row className="justify-content-center">
          <Col xxl={4} md={6} sm={8}>
            <Card className="p-4">
              <div className="auth-brand text-center mb-4">
                <AppLogo />
                <p className="text-muted w-lg-75 mt-3 mx-auto">
                  Your account requires a second sign-in step. Complete verification below.
                </p>
              </div>
              <MfaVerifyForm
                onSuccess={() => navigate(ROUTE_PATHS.DASHBOARD, { replace: true })}
                onCancel={async () => {
                  await logout()
                  navigate(ROUTE_PATHS.LOGIN, { replace: true })
                }}
                cancelLabel="Sign out and return to login"
              />
            </Card>
            <p className="text-center text-muted mt-4 mb-0">© {currentYear} WPHub.Pro</p>
          </Col>
        </Row>
      </Container>
    </div>
  )
}

export default MfaChallengePage
