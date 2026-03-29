import ColorPicker from '@/views/forms/pickers/components/ColorPicker'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import { Col, Container, Row } from 'react-bootstrap'
import ReactFlatPicker from "@/views/forms/pickers/components/ReactFlatPicker.tsx";
import ReactDayPicker from "@/views/forms/pickers/components/ReactDayPicker.tsx";
import ReactDatePicker from "@/views/forms/pickers/components/ReactDatePicker.tsx";

const Index = () => {
  return (
    <>
      <Container fluid>
        <PageBreadcrumb title="Pickers" subtitle="Forms" />
        <Row className="justify-content-center">
          <Col lg={12}>
            <ReactDatePicker />

            <ReactDayPicker />

            <ReactFlatPicker />

            <ColorPicker />
          </Col>
        </Row>
      </Container>
    </>
  )
}

export default Index
