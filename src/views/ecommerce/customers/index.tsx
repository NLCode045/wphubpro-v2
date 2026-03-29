import { Col, Container, Row } from 'react-bootstrap'

import PageBreadcrumb from '@/components/PageBreadcrumb.tsx'
import CustomersCard from './components/CustomersCard.tsx'

const Index = () => {
  return (
    <Container fluid>
      <PageBreadcrumb title="Customers" subtitle="Ecommerce" />

      <Row className="justify-content-center">
        <Col xxl={12}>
          <CustomersCard />
        </Col>
      </Row>
    </Container>
  )
}

export default Index
