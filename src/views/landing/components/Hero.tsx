
import dashboardImg from "@/assets/images/dashboard.png"
import { Button, Col, Container, Row } from "react-bootstrap"
import { TbBasket } from "react-icons/tb"


const Hero = () => {
  return (
    <section className="bg-light bg-opacity-50 border-top border-light position-relative" id="home">
      <Container className="pt-5 mt-5 position-relative">
        <Row>
          <Col lg={8} className="mx-auto text-center">
            <h1 className="my-4 fs-36 fw-bold lh-base">
              Modern, Powerful &amp; Flexible <span className="text-primary">Admin &amp; Dashboard</span> Template –&nbsp;<span className="text-muted">Built for Serious Web Applications</span>
            </h1>
            <p className="mb-4 fs-md text-muted lh-lg">
              Build fast, modern, and scalable web apps with our best-selling Admin Dashboard Template.
              Engineered for performance, flexibility, and easy customization — ideal for startups, agencies, and enterprise teams.
            </p>
            <div className="d-flex gap-1 gap-sm-2 flex-wrap justify-content-center">
              <Button variant="primary" className="py-2 fw-semibold" href="#">
                <TbBasket className="fs-xl me-2" />Buy UBold Now!
              </Button>
            </div>
          </Col>
        </Row>
        <Container className="position-relative">
          <Row>
            <Col md={10} className="mx-auto position-relative">
              <img src={dashboardImg} className="rounded-top-4 img-fluid mt-5" alt="saas-img" />
            </Col>
          </Row>
        </Container>
      </Container>
    </section>

  )
}

export default Hero
