

import { Row, Col, Container, Card, CardBody } from "react-bootstrap"

import confirmImg from "@/assets/images/emails/confirm.png"
import activatedImg from "@/assets/images/emails/activated.png"
import marketingImg from "@/assets/images/emails/marketing.png"
import invoiceImg from "@/assets/images/emails/invoice.png"
import reportsImg from "@/assets/images/emails/reports.png"
import resetPasswordImg from "@/assets/images/emails/reset-password.png"
import warningImg from "@/assets/images/emails/warning-mail.png"
import PageBreadcrumb from '@/components/PageBreadcrumb'

type EmailTemplate = {
  title: string
  image: string
}

const emailTemplates: EmailTemplate[] = [
  { title: "Basic Action", image: confirmImg },
  { title: "Activated Account", image: activatedImg },
  { title: "Marketing", image: marketingImg },
  { title: "Invoice", image: invoiceImg },
  { title: "Reports", image: reportsImg },
  { title: "Reset Password", image: resetPasswordImg },
  { title: "Warning", image: warningImg },
]


export default function EmailTemplates() {
  return (
    <Container fluid>
      <PageBreadcrumb title={'Email Templates'} subtitle="Email" />
      <Card>
        <CardBody>
          <Row className="g-3">
            {emailTemplates.map((item, index) => (
              <Col key={index} md={4} sm={6}>
                <h4 className="header-title mb-3">{item.title}</h4>
                <img src={item.image} alt={item.title} className="img-fluid" />
              </Col>
            ))}
          </Row>
        </CardBody>
      </Card>
    </Container>
  )
}
