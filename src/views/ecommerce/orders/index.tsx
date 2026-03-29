import { Col, Container, Row } from 'react-bootstrap'

import OrdersStats from '@/views/ecommerce/orders/components/OrdersStats'
import PageBreadcrumb from '@/components/PageBreadcrumb.tsx'
import OrdersList from './components/OrdersList.tsx'

const Index = () => {
  return (
    <Container fluid>
      <PageBreadcrumb title="Orders" subtitle="Ecommerce" />

      <OrdersStats />

      <Row>
        <Col cols={12}>
          <OrdersList />
        </Col>
      </Row>
    </Container>
  )
}

export default Index
