import ReactSelect from '@/views/forms/select/components/ReactSelect'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import { Col, Container, Row } from 'react-bootstrap'

const Index = () => {
  return (
    <Container fluid>
      <PageBreadcrumb title="Select" subtitle="Forms" />

      <Row className="justify-content-center">
        <Col lg={12}>
          <ReactSelect />
        </Col>
      </Row>
    </Container>
  )
}

export default Index
