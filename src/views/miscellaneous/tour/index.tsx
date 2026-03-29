import {features} from '@/views/miscellaneous/tour/data'
import AppLogo from '@/components/AppLogo'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import Tour from '@rc-component/tour'
import {Link} from "react-router";
import {useRef, useState} from 'react'
import {Button, Card, CardBody, CardFooter, Col, Container, Row} from 'react-bootstrap'
import {TbArrowRight, TbCompass, TbPlayerPlay, TbShoppingCart} from 'react-icons/tb'

const Index = () => {
  const [openTour, setOpenTour] = useState(false)

  const step1Ref = useRef<HTMLAnchorElement | null>(null)
  const step2Ref = useRef<HTMLAnchorElement | null>(null)
  const step3Ref = useRef<HTMLDivElement | null>(null)
  const step4Ref = useRef<HTMLButtonElement | null>(null)

  return (
    <Container fluid>
      <PageBreadcrumb title="Tour" subtitle="Miscellaneous" />

      <div>
        <Row className="justify-content-center">
          <Col lg={5}>
            <div className="text-center mt-4 mb-5">
              <div className="auth-brand text-center mb-4">
                <AppLogo height={32}/>
              </div>

              <h5 className="fs-lg mb-2">Versatile & Scalable Admin Panel Template</h5>
              <p className="text-muted fs-sm">
                Build modern web applications faster with our feature-rich admin panel. Compatible with multiple frameworks and packed with diverse demos, it offers seamless customization and a consistent UI across all your projects.
              </p>

              <div className="d-flex justify-content-center mt-4 flex-wrap gap-2">
                <Button
                  variant="primary"
                  onClick={() => {
                    if (step1Ref.current) {
                      setOpenTour(true)
                    }
                  }}>
                  <TbPlayerPlay className="me-1" />  Start Guided Tour
                </Button>

                <Link ref={step1Ref} to="" className="btn btn-dark">
                  <TbCompass className="me-1" /> Discover Features
                </Link>

                <Link
                  ref={step2Ref}
                  to=""
                  target="_blank"
                  className="btn btn-danger">
                  <TbShoppingCart className="me-1" /> Get the Template

                </Link>
              </div>
            </div>
          </Col>
        </Row>

        <Container ref={step3Ref}>

          <Row>
            {features.map((feature, idx) => (
              <Col xl={3} key={idx}>
                <Card className="border-0 p-2 card-h-100">
                  <CardBody className="pb-0">
                    <div className="avatar-xl mb-3">
                              <span className="avatar-title text-bg-secondary rounded-circle fs-22">
                                <feature.icon />
                              </span>
                    </div>
                    <h4 className="fw-semibold mb-2">{feature.title}</h4>
                    <p className="text-muted mb-3">{feature.description}</p>
                  </CardBody>
                  <CardFooter className="border-0 pt-0">
                    <a className="link-primary fw-semibold" href="#">
                      Know more <TbArrowRight className="ms-2 align-middle" />
                    </a>
                  </CardFooter>
                </Card>
              </Col>
            ))}
          </Row>
        </Container>

      </div>

      <Tour
        defaultCurrent={1}
        open={openTour}
        onClose={() => setOpenTour(false)}
        animated
        mask
        steps={[
          {
            title: 'Getting Started',
            description: 'Click here to get started and explore our framework-rich admin panel. 🚀',
            target: () => step1Ref.current!,
            placement: 'left',
          },
          {
            title: 'Buy Now',
            description: 'Ready to supercharge your project ? Click here to purchase the template!',
            target: () => step2Ref.current!,
            placement: 'left',
          },
          {
            title: 'Core Features',
            description: 'Learn more about the versatile services and modules we provide to enhance development',
            target: () => step3Ref.current!,
            placement: 'top',
          },
          {
            title: 'Documentation',
            description: 'Thanks for exploring! Read the documentation to get the most out of this template.',
            target: () => step4Ref.current!,
            placement: 'top',
          },
        ]}
      />
    </Container>
  )
}

export default Index
