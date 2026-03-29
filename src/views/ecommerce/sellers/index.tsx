import { Col, Container, Row } from 'react-bootstrap'

import PageBreadcrumb from '@/components/PageBreadcrumb.tsx'
import SellersCard from './components/SellersCard.tsx'

const Index = () => {
  return (
    <Container fluid>
      <PageBreadcrumb title="Sellers" subtitle="Ecommerce" />
      <Row className="justify-content-center">
        <Col xxl={12}>
          <SellersCard />
        </Col>
      </Row>
    </Container>
  )
}

export default Index
