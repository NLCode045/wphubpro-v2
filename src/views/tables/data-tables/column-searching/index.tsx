
import ComponentCard from '@/components/cards/ComponentCard'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import { Col, Container, Form, Row } from 'react-bootstrap'

import DT from 'datatables.net-bs5'
import DataTable from 'datatables.net-react'
import 'datatables.net-responsive'

import ReactDOMServer from 'react-dom/server'
import { TbChevronLeft, TbChevronRight, TbChevronsLeft, TbChevronsRight } from 'react-icons/tb'

import { columns, tableData } from '@/views/tables/data-tables/data'

const Example = () => {
  DataTable.use(DT)
  return (
    <ComponentCard title="Example">
      <DataTable
        data={tableData.body}
        columns={columns}
        options={{
          responsive: true,
          initComplete: function () {
            const api = this.api()

            // Disable sorting clicks on #xx th elements
            document.querySelectorAll('#column-search-inputs th').forEach((th) => {
              th.addEventListener('click', function (e) {
                e.stopPropagation() // Prevent sorting trigger
              })
            })

            // Handle input filtering for columns
            document.querySelectorAll('#column-search-inputs th input').forEach((input, index) => {
              input.addEventListener('click', function (e) {
                e.stopPropagation() // Prevent input click from bubbling up too
              })

              input.addEventListener('keyup', function (this: any) {
                if (api.column(index).search() !== this.value) {
                  api.column(index).search(this.value).draw()
                }
              })
            })
          },
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
          <tr id="column-search-inputs" className="column-search-input-bar">
            <th>
              <Form.Control size="sm" type="text" placeholder="Company" className="bg-light-subtle border-light" />
            </th>
            <th>
              <Form.Control size="sm" type="text" placeholder="Symbol" className="bg-light-subtle border-light" />
            </th>
            <th>
              <Form.Control size="sm" type="text" placeholder="Price" className="bg-light-subtle border-light" />
            </th>
            <th>
              <Form.Control size="sm" type="text" placeholder="Change" className="bg-light-subtle border-light" />
            </th>
            <th>
              <Form.Control size="sm" type="text" placeholder="Volume" className="bg-light-subtle border-light" />
            </th>
            <th>
              <Form.Control size="sm" type="text" placeholder="Market Cap" className="bg-light-subtle border-light" />
            </th>
            <th>
              <Form.Control size="sm" type="text" placeholder="Rating" className="bg-light-subtle border-light" />
            </th>
            <th>
              <Form.Control size="sm" type="text" placeholder="Status" className="bg-light-subtle border-light" />
            </th>
          </tr>
        </thead>
      </DataTable>
    </ComponentCard>
  )
}

const Index = () => {
  return (
    <Container fluid>
      <PageBreadcrumb title="Column Searching" subtitle="Data Tables" />

      <Row className="justify-content-center">
        <Col xxl={12}>
          <Example />
        </Col>
      </Row>
    </Container>
  )
}

export default Index
