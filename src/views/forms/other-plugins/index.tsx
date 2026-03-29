import ReactInputMask from '@/views/forms/other-plugins/components/ReactInputMask'
import ReactTypeahead from '@/views/forms/other-plugins/components/ReactTypeahead'
import TouchSpin from '@/views/forms/other-plugins/components/Touchspin'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import { Col, Container, Row } from 'react-bootstrap'

const Index = () => {
  return (
    <>
      <Container fluid>
        <PageBreadcrumb title="Other Plugins" subtitle="Forms" />

        <Row>
          <Col xs={12}>
            <ReactInputMask />
            <ReactTypeahead />
            <TouchSpin />
          </Col>
        </Row>
      </Container>
    </>
  )
}

export default Index
