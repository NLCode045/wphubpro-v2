import ChecksRadiosSwitches from '@/views/forms/basic/components/ChecksRadiosSwitches'
import FloatingLabels from '@/views/forms/basic/components/FloatingLabels'
import InputGroups from '@/views/forms/basic/components/InputGroups'
import InputSizes from '@/views/forms/basic/components/InputSizes'
import InputTextFieldType from '@/views/forms/basic/components/InputTextFieldType'
import InputType from '@/views/forms/basic/components/InputType'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import { Col, Container, Row } from 'react-bootstrap'

const Index = () => {
  return (
    <>
      <Container fluid>
        <PageBreadcrumb title="Basic Elements" subtitle="Forms" />
        <Row>
          <Col xl={12}>
            <InputTextFieldType />

            <InputType />

            <InputGroups />

            <FloatingLabels />

            <InputSizes />

            <ChecksRadiosSwitches />
          </Col>
        </Row>
      </Container>
    </>
  )
}

export default Index
