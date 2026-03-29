import { Col, Container, FormControl, FormLabel, Row } from 'react-bootstrap'
import { TbMail, TbMapPin, TbPhoneCall } from 'react-icons/tb'

const Contact = () => {
  return (
    <section className="section-custom bg-light bg-opacity-30 border-top" id="contact">
      <Container>
        <Row>
          <Col xs={12} className="text-center">
            <span className="text-muted rounded-3 d-inline-block">📞 Get in Touch</span>
            <h2 className="mt-3 fw-bold mb-5">We’d Love to Hear From <span className="text-primary">You</span></h2>
          </Col>
        </Row>
        <Row>
          <Col xxl={4} >
            <div className="p-4">
              <div className="d-flex gap-3 mb-4">
                <div className="avatar-xl flex-shrink-0">
                  <span className="avatar-title bg-secondary-subtle text-secondary rounded-circle fs-22">
                    <TbPhoneCall />
                  </span>
                </div>
                <div>
                  <span className="text-muted">Contact Numbers</span>
                  <h5 className="my-2">+1 (555) 123-4567</h5>
                  <h5 className="mb-0">+1 (555) 765-4321</h5>
                </div>
              </div>
              <div className="d-flex gap-3 mb-4">
                <div className="avatar-xl flex-shrink-0">
                  <span className="avatar-title bg-secondary-subtle text-secondary rounded-circle fs-22">
                    <TbMail />
                  </span>
                </div>
                <div>
                  <span className="text-muted">Email</span>
                  <h5 className="my-2">info@ubold.com</h5>
                  <h5 className="mb-0">support@ubold.com</h5>
                </div>
              </div>
              <div className="d-flex gap-3">
                <div className="avatar-xl flex-shrink-0">
                  <span className="avatar-title bg-secondary-subtle text-secondary rounded-circle fs-22">
                    <TbMapPin />
                  </span>
                </div>
                <div>
                  <span className="text-muted">Address</span>
                  <h5 className="my-1 lh-lg">UBold HQ, 500 Innovation Drive, Suite 200, Metropolis, NY 10101, USA</h5>
                </div>
              </div>
            </div>
          </Col>
          <Col xxl={8}>
            <form className="p-4 border rounded-4 border-dashed">
              <Row className="g-3">
                <Col md={6}>
                  <FormLabel htmlFor="name">Full Name</FormLabel>
                  <FormControl type="text" className="bg-light bg-opacity-50 border-0 py-2" id="name" autoComplete="name" placeholder="Enter your full name" />
                </Col>
                <Col md={6}>
                  <FormLabel htmlFor="email">Email Address</FormLabel>
                  <FormControl type="email" className="bg-light bg-opacity-50 border-0 py-2" id="email" autoComplete="email" placeholder="Enter your email" />
                </Col>
                <Col md={12}>
                  <FormLabel htmlFor="subject">Subject</FormLabel>
                  <FormControl type="text" className="bg-light bg-opacity-50 border-0 py-2" id="subject" placeholder="What’s the reason for contact?" />
                </Col>
                <Col md={12}>
                  <FormLabel htmlFor="message">Message</FormLabel>
                  <FormControl as={'textarea'} className="bg-light bg-opacity-50 border-0 py-2" id="message" rows={5} placeholder="Write your message here..." defaultValue={""} />
                </Col>
                <Col md={12} className="text-end">
                  <button type="submit" className="btn btn-primary rounded-pill">Send Message</button>
                </Col>
              </Row>
            </form>
          </Col>
        </Row>
      </Container>
    </section>

  )
}

export default Contact
