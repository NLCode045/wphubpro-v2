import { Col, Container, Row } from 'react-bootstrap'

import BillingDetails from '@/views/ecommerce/orders/[orderId]/components/BillingDetails'
import CustomerDetails from '@/views/ecommerce/orders/[orderId]/components/CustomerDetails'
import OrderSummary from '@/views/ecommerce/orders/[orderId]/components/OrderSummary'
import ShippingActivity from '@/views/ecommerce/orders/[orderId]/components/ShippingActivity'
import ShippingAddress from '@/views/ecommerce/orders/[orderId]/components/ShippingAddress'
import PageBreadcrumb from '@/components/PageBreadcrumb.tsx'

const Index = () => {
  return (
    <Container fluid>
      <PageBreadcrumb title="Order Details" subtitle="Ecommerce" />

      <Row className="justify-content-center">
        <Col xxl={12}>
          <Row>
            <Col xl={9}>
              <OrderSummary />

              <ShippingActivity />
            </Col>
            <Col xl={3}>
              <CustomerDetails />

              <ShippingAddress />

              <BillingDetails />
            </Col>
          </Row>
        </Col>
      </Row>
    </Container>
  )
}

export default Index
