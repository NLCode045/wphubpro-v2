
import ComponentCard from '@/components/cards/ComponentCard'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import { Button, Col, Container, Row } from 'react-bootstrap'

import DT from 'datatables.net-bs5'
import DataTable, { type DataTableRef } from 'datatables.net-react'
import 'datatables.net-responsive'

import ReactDOMServer from 'react-dom/server'
import { TbChevronLeft, TbChevronRight, TbChevronsLeft, TbChevronsRight } from 'react-icons/tb'

import { columns, tableData } from '@/views/tables/data-tables/data'
import { useRef } from 'react'

const Example = () => {
  DataTable.use(DT)

  const tableRef = useRef<DataTableRef | null>(null)

  return (
    <ComponentCard title="Example">
      <Button variant="primary" className="mb-3" onClick={() => tableRef.current?.dt()?.row.add(tableData.body[0]).draw(false)}>
        Add Row
      </Button>
      <DataTable
        ref={tableRef}
        data={tableData.body.slice(0, 5)}
        columns={columns}
        options={{
          responsive: true,
          language: {
            paginate: {
              first: ReactDOMServer.renderToStaticMarkup(<TbChevronsLeft className="fs-lg" />),
              previous: ReactDOMServer.renderToStaticMarkup(<TbChevronLeft className="fs-lg" />),
              next: ReactDOMServer.renderToStaticMarkup(<TbChevronRight className="fs-lg" />),
              last: ReactDOMServer.renderToStaticMarkup(<TbChevronsRight className="fs-lg" />),
            },
          },
        }}
        className="table table-striped dt-responsive align-middle mb-0">
        <thead className="thead-sm text-uppercase fs-xxs">
          <tr>
            {tableData.header.map((label, idx) => (
              <th key={idx}>{label}</th>
            ))}
          </tr>
        </thead>
      </DataTable>
    </ComponentCard>
  )
}

const Index = () => {
  return (
    <Container fluid>
      <PageBreadcrumb title="Add Rows" subtitle="Data Tables" />

      <Row className="justify-content-center">
        <Col xxl={12}>
          <Example />
        </Col>
      </Row>
    </Container>
  )
}

export default Index
