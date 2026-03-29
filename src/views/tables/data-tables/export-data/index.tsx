
import PageBreadcrumb from '@/components/PageBreadcrumb'
import ComponentCard from '@/components/cards/ComponentCard'
import { Col, Container, Row } from 'react-bootstrap'

import DT from 'datatables.net-bs5'
import DataTable from 'datatables.net-react'

import 'datatables.net-buttons-bs5'
import 'datatables.net-buttons/js/buttons.html5'

import ReactDOMServer from 'react-dom/server'
import { TbChevronLeft, TbChevronRight, TbChevronsLeft, TbChevronsRight } from 'react-icons/tb'

import jszip from 'jszip'
import pdfmake from 'pdfmake'

import { columns, tableData } from '@/views/tables/data-tables/data'

const ExportDataWithButtons = () => {
  DataTable.use(DT)
  DT.Buttons.jszip(jszip)
  DT.Buttons.pdfMake(pdfmake)
  return (
    <ComponentCard title="Export Data With Buttons">
      <DataTable
        data={tableData.body}
        columns={columns}
        options={{
          responsive: true,
          layout: {
            topStart: 'buttons',
          },
          buttons: [
            { extend: 'copy', className: 'btn btn-sm btn-secondary' },
            { extend: 'csv', className: 'btn btn-sm btn-secondary active' },
            { extend: 'excel', className: 'btn btn-sm btn-secondary' },
            { extend: 'pdf', className: 'btn btn-sm btn-secondary active' },
          ],
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

const ExportDataWithDropdown = () => {
  DataTable.use(DT)
  DT.Buttons.jszip(jszip)
  DT.Buttons.pdfMake(pdfmake)
  return (
    <ComponentCard title="Export Data With Dropdown">
      <DataTable
        data={tableData.body}
        columns={columns}
        options={{
          responsive: true,
          dom:
            "<'d-md-flex justify-content-between align-items-center my-2'<'dropdown'B>f>" +
            'rt' +
            "<'d-md-flex justify-content-between align-items-center mt-2'ip>",
          buttons: [
            {
              extend: 'collection',
              text: 'Export',
              buttons: ['copy', 'csv', 'excel', 'pdf'],
              className: 'btn btn-sm btn-secondary dropdown-toggle',
            },
          ],
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
      <PageBreadcrumb title="Export Data" subtitle="Data Tables" />

      <Row className="justify-content-center">
        <Col xxl={12}>
          <ExportDataWithButtons />
          <ExportDataWithDropdown />
        </Col>
      </Row>
    </Container>
  )
}

export default Index
