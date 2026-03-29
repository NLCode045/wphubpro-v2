import ActiveRowTable from '@/views/tables/static/components/ActiveRowTable'
import BasicTable from '@/views/tables/static/components/BasicTable'
import BorderedTable from '@/views/tables/static/components/BorderedTable'
import BorderlessTable from '@/views/tables/static/components/BorderlessTable'
import CustomTable from '@/views/tables/static/components/CustomTable'
import HoverableRowsTable from '@/views/tables/static/components/HoverableRowsTable'
import NestedTable from '@/views/tables/static/components/NestedTable'
import SmallTable from '@/views/tables/static/components/SmallTable'
import StripedColumnTable from '@/views/tables/static/components/StripedColumnTable'
import StripedRowTable from '@/views/tables/static/components/StripedRowTable'
import TableCaption from '@/views/tables/static/components/TableCaption'
import TableGroupDividers from '@/views/tables/static/components/TableGroupDividers'
import TableHead from '@/views/tables/static/components/TableHead'
import TableVariants from '@/views/tables/static/components/TableVariants'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import { Col, Container, Row } from 'react-bootstrap'

const Index = () => {
  return (
    <Container fluid>
      <PageBreadcrumb title="Static Tables" subtitle="Tables" />
      <Row className="justify-content-center">
        <Col xxl={12}>
          <BasicTable />

          <CustomTable />

          <TableVariants />

          <StripedRowTable />

          <StripedColumnTable />

          <HoverableRowsTable />

          <ActiveRowTable />

          <BorderedTable />

          <BorderlessTable />

          <SmallTable />

          <TableGroupDividers />

          <NestedTable />

          <TableHead />

          <TableCaption />
        </Col>
      </Row>
    </Container>
  )
}

export default Index
