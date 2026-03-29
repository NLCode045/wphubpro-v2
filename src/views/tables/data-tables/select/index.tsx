
import PageBreadcrumb from '@/components/PageBreadcrumb'
import ComponentCard from '@/components/cards/ComponentCard'
import { Col, Container, Row } from 'react-bootstrap'

import DT from 'datatables.net-bs5'
import DataTable from 'datatables.net-react'
import 'datatables.net-select'

import ReactDOMServer from 'react-dom/server'
import { TbChevronLeft, TbChevronRight, TbChevronsLeft, TbChevronsRight } from 'react-icons/tb'

import { columns, tableData } from '@/views/tables/data-tables/data'

const SingleItemSelect = () => {
  DataTable.use(DT)
  return (
    <ComponentCard title="Single Item Select">
      <DataTable
        data={tableData.body}
        columns={columns}
        options={{
          responsive: true,
          select: { style: 'single' },
          pageLength: 7,
          lengthMenu: [7, 10, 25, 50, -1],
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

const MultiItemSelection = () => {
  DataTable.use(DT)
  return (
    <ComponentCard title="Multi Item Selection">
      <DataTable
        data={tableData.body}
        columns={columns}
        options={{
          responsive: true,
          select: { style: 'multi' },
          pageLength: 7,
          lengthMenu: [7, 10, 25, 50, -1],
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

const CellSelection = () => {
  DataTable.use(DT)
  return (
    <ComponentCard title="Cell Selection">
      <DataTable
        data={tableData.body}
        columns={columns}
        options={{
          responsive: true,
          select: { style: 'os', items: 'cell' },
          pageLength: 7,
          lengthMenu: [7, 10, 25, 50, -1],
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
      <PageBreadcrumb title="Select" subtitle="Data Tables" />

      <Row className="justify-content-center">
        <Col xxl={12}>
          <SingleItemSelect />

          <MultiItemSelection />

          <CellSelection />
        </Col>
      </Row>
    </Container>
  )
}

export default Index
