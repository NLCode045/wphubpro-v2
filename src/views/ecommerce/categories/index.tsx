import { Col, Container, Row } from 'react-bootstrap'

import CategoriesTable from '@/views/ecommerce/categories/components/CategoriesTable'
import PageBreadcrumb from '@/components/PageBreadcrumb.tsx'

const Index = () => {
  return (
    <Container fluid>
      <PageBreadcrumb title="Categories" subtitle="Ecommerce" />

      <Row className="row">
        <Col xs={12}>
          <CategoriesTable />
        </Col>
      </Row>
    </Container>
  )
}

export default Index
