
import { Col, Container, Row } from 'react-bootstrap'

import PageBreadcrumb from '@/components/PageBreadcrumb'
import NestedListWithHandle from './components/NestedListWithHandle.tsx'
import NestedSortableList from './components/NestedSortableList.tsx'
import SortableWithIcons from './components/SortableWithIcons.tsx'

const Index = () => {
  return (
    <Container fluid>
      <PageBreadcrumb title="Nestable List" subtitle="Miscellaneous" />

      <Row>
        <Col lg={6}>
          <NestedSortableList />
        </Col>

        <Col lg={6}>
          <NestedListWithHandle />
        </Col>
      </Row>

      <Row>
        <Col lg={6}>
          <SortableWithIcons />
        </Col>
      </Row>
    </Container>
  )
}

export default Index
