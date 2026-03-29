import Dropzone from '@/views/forms/file-uploads/components/Dropzone'
import FilePond from '@/views//forms/file-uploads/components/ReactFilePond'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import { Col, Container, Row } from 'react-bootstrap'

const Index = () => {
  return (
    <>
      <Container fluid>
        <PageBreadcrumb title="File Uploads" subtitle="Forms" />
        <Row>
          <Col cols={12}>
            <Dropzone />
            <FilePond />
          </Col>
        </Row>
      </Container>
    </>
  )
}

export default Index
