import { Col, Container, Row } from 'react-bootstrap'

import PageBreadcrumb from '@/components/PageBreadcrumb'
import ExamplesCard from './components/ExamplesCard.tsx'

const Index = () => {
  return (
    <>
      <Container fluid>
        <PageBreadcrumb title="Vector Maps" />
        <Row>
          <Col sm={12}>
            <ExamplesCard />
          </Col>
        </Row>
      </Container>
    </>
  )
}

export default Index
