import {customizationFaqs, generalFaqs, paymentFaqs, refundFaqs} from '@/views/pages/faq/data'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import {
    Accordion,
    AccordionBody,
    AccordionButton,
    AccordionItem,
    Card,
    CardBody,
    CardHeader,
    CardTitle,
    Col,
    Container,
    Row,
} from 'react-bootstrap'
import {TbBrandTwitter, TbHelpHexagon, TbMail} from 'react-icons/tb'

const Index = () => {
  return (
    <Container fluid>
      <PageBreadcrumb title="FAQs" subtitle="Pages" />

      <Row className="justify-content-center">
        <Col xxl={10}>
          <Row className="justify-content-center mb-5">
            <Col lg={6} md={8}>
              <div className="text-center">
                <div className="mb-3">
                  <TbHelpHexagon className="fs-1 text-primary"/>
                </div>
                <h3 className="fw-semibold mb-2">Need Help with Something?</h3>
                <p className="text-muted mb-4">
                  We're here to assist you with any technical questions, account issues, or feedback.<br/>
                  Reach out to our support team — we’ll get back to you as soon as possible!
                </p>
                <div className="d-flex justify-content-center gap-2 flex-wrap">
                  <a href="mailto:support@example.com" className="btn btn-success">
                    <TbMail className="fs-5 me-1"></TbMail> Contact Support
                  </a>
                  <a href="https://twitter.com/intent/tweet?text=Hello+Support" target="_blank" className="btn btn-primary">
                    <TbBrandTwitter className="fs-5 me-1"/> Tweet to Us
                  </a>
                </div>
              </div>

            </Col>
          </Row>

          <Row>
            <Col xl={6}>
              <Card>
                <CardHeader className="d-block">
                  <CardTitle as="h4" className="mb-1">
                    General
                  </CardTitle>
                  <p className="text-muted mb-0">Here are some common questions about our templates.</p>
                </CardHeader>

                <CardBody>
                  <Accordion className="accordion-bordered">
                    {generalFaqs.map((faq, idx) => (
                      <AccordionItem eventKey={idx.toString()} key={idx} className="border-0">
                        <AccordionButton className="shadow-none bg-light bg-opacity-50">{faq.question}</AccordionButton>
                        <AccordionBody>{faq.answer}</AccordionBody>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardBody>
              </Card>
            </Col>

            <Col xl={6}>
              <Card>
                <CardHeader className="d-block">
                  <CardTitle as="h4" className="mb-1">
                    Payments
                  </CardTitle>
                  <p className="text-muted mb-0">Here are some common questions related to billing and payment.</p>
                </CardHeader>

                <CardBody>
                  <Accordion className="accordion-bordered">
                    {paymentFaqs.map((faq, idx) => (
                      <AccordionItem eventKey={idx.toString()} key={idx} className="border-0">
                        <AccordionButton className="shadow-none bg-light bg-opacity-50">{faq.question}</AccordionButton>
                        <AccordionBody>{faq.answer}</AccordionBody>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardBody>
              </Card>
            </Col>
          </Row>

          <Row>
            <Col xl={6}>
              <Card>
                <CardHeader className="d-block">
                  <CardTitle as="h4" className="mb-1">
                    Refunds
                  </CardTitle>
                  <p className="text-muted mb-0">Find answers related to our refund policy and conditions.</p>
                </CardHeader>
                <CardBody>
                  <Accordion className="accordion-bordered">
                    {refundFaqs.map((faq, idx) => (
                      <AccordionItem eventKey={idx.toString()} key={idx} className="border-0">
                        <AccordionButton className="shadow-none bg-light bg-opacity-50">{faq.question}</AccordionButton>
                        <AccordionBody>{faq.answer}</AccordionBody>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardBody>
              </Card>
            </Col>

            <Col xl={6}>
              <Card>
                <CardHeader className="d-block">
                  <CardTitle as="h4" className="mb-1">
                    Customization
                  </CardTitle>
                  <p className="text-muted mb-0">Questions about custom development and template modifications.</p>
                </CardHeader>
                <CardBody>
                  <Accordion className="accordion-bordered">
                    {customizationFaqs.map((faq, idx) => (
                      <AccordionItem eventKey={idx.toString()} key={idx} className="border-0">
                        <AccordionButton className="shadow-none bg-light bg-opacity-50">{faq.question}</AccordionButton>
                        <AccordionBody>{faq.answer}</AccordionBody>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardBody>
              </Card>
            </Col>
          </Row>
        </Col>
      </Row>
    </Container>
  )
}

export default Index
