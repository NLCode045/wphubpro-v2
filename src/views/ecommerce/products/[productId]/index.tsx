import { Card, CardBody, Col, Container, Row } from 'react-bootstrap'

import ProductDetails from '@/views/ecommerce/products/[productId]/components/ProductDetails'
import ProductDisplay from '@/views/ecommerce/products/[productId]/components/ProductDisplay'
import ProductReviews from '@/views/ecommerce/products/[productId]/components/ProductReviews'
import PageBreadcrumb from '@/components/PageBreadcrumb.tsx'

const Index = () => {
  return (
    <Container fluid>
      <PageBreadcrumb title="Product Details" subtitle="Ecommerce" />

      <Row>
        <Col xs={12}>
          <Card>
            <CardBody>
              <Row>
                <ProductDisplay />

                <Col xl={8}>
                  <div className="p-4">
                    <ProductDetails />

                    <ProductReviews />
                  </div>
                </Col>
              </Row>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </Container>
  )
}

export default Index
