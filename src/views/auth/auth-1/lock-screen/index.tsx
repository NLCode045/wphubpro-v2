import avatar from '@/assets/images/users/user-1.jpg'
import AppLogo from '@/components/AppLogo'
import {currentYear} from '@/helpers'

import {Link} from "react-router";
import {Button, Card, Col, Container, Form, FormControl, FormLabel, Row} from 'react-bootstrap'

const Index = () => {
  return (
    <div className="auth-box overflow-hidden align-items-center d-flex">
      <Container>
        <Row className="justify-content-center">
          <Col xxl={4} md={6} sm={8}>

            <Card className="p-4 ">
              <div className="auth-brand text-center mb-3">
                <AppLogo />
              </div>
              <div className="text-center mb-4">
                <img src={avatar} className="rounded-circle img-thumbnail avatar-xxl mb-2" alt="thumbnail" />
                <h5 className="fs-md">Geneva D.</h5>
              </div>

              <Form>
                <div className="mb-3">
                  <FormLabel htmlFor="userPassword">
                    Password <span className="text-danger">*</span>
                  </FormLabel>
                  <div className="input-group">
                    <FormControl type="password" id="userPassword" placeholder="••••••••" required />
                  </div>
                </div>

                <div className="d-grid">
                  <Button type="submit" className="btn btn-primary fw-semibold py-2">
                    Unlock
                  </Button>
                </div>
              </Form>

              <p className="text-muted text-center mt-4 mb-0">
                Not you? Return to{' '}
                <Link to="/auth-1/sign-in" className="text-decoration-underline link-offset-3 fw-semibold">
                  Sign in
                </Link>
              </p>
            </Card>

            <p className="text-center text-muted mt-4 mb-0">
              © {currentYear} UBold — by <span className="fw-semibold">Coderthemes</span>
            </p>
          </Col>
        </Row>
      </Container>
    </div>
  )
}

export default Index
