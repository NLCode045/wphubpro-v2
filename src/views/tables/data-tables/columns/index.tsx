
import ComponentCard from '@/components/cards/ComponentCard'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import { useRef, useState } from 'react'
import { Col, Container, Dropdown, Form, Row } from 'react-bootstrap'

import DT from 'datatables.net-bs5'
import DataTable, { type DataTableRef } from 'datatables.net-react'
import 'datatables.net-responsive'

import ReactDOMServer from 'react-dom/server'
import { TbChevronLeft, TbChevronRight, TbChevronsLeft, TbChevronsRight } from 'react-icons/tb'

import { columns, tableData } from '@/views/tables/data-tables/data'

const columnLabels = ['Company', 'Symbol', 'Price', 'Change', 'Volume', 'Market Cap', 'Rating', 'Status']

const Example = () => {
  DataTable.use(DT)

  const tableRef = useRef<DataTableRef | null>(null)
  const [visibleColumns, setVisibleColumns] = useState<boolean[]>(() => new Array(columnLabels.length).fill(true))

  const handleColumnToggle = (index: number) => {
    if (tableRef.current) {
      const column = tableRef.current.dt()?.column(index)
      const currentVisible = column?.visible()
      column?.visible(!currentVisible)

      setVisibleColumns((prev) => {
        const updated = [...prev]
        updated[index] = !currentVisible
        return updated
      })
    }
  }

  return (
    <ComponentCard title="Example">
      <Dropdown autoClose="outside" className="mb-3">
        <Dropdown.Toggle variant="secondary" size="sm">
          Show/Hide Columns
        </Dropdown.Toggle>

        <Dropdown.Menu className="p-2 border shadow-sm">
          {columnLabels.map((label, index) => (
            <Dropdown.Item key={index} as="div" className="px-0">
              <Form.Check
                type="checkbox"
                id={`colToggle${index}`}
                label={label}
                checked={visibleColumns[index]}
                onChange={() => handleColumnToggle(index)}
                className="ms-2"
              />
            </Dropdown.Item>
          ))}
        </Dropdown.Menu>
      </Dropdown>

      <DataTable
        ref={tableRef}
        data={tableData.body}
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
      <PageBreadcrumb title="Show & Hide Column" subtitle="Data Tables" />

      <Row className="justify-content-center">
        <Col xxl={12}>
          <Example />
        </Col>
      </Row>
    </Container>
  )
}

export default Index
