
import ComponentCard from '@/components/cards/ComponentCard'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import { Col, Container, Row } from 'react-bootstrap'

import DT from 'datatables.net-bs5'
import DataTable, {type  DataTableRef } from 'datatables.net-react'
import 'datatables.net-responsive'
import 'datatables.net-select'

import ReactDOMServer from 'react-dom/server'
import { TbChevronLeft, TbChevronRight, TbChevronsLeft, TbChevronsRight } from 'react-icons/tb'

import { tableData } from '@/views/tables/data-tables/data'
import { currency } from '@/helpers'
import { useEffect, useRef } from 'react'

const columns = [
  {
    data: null,
    orderable: false,
    className: 'select-checkbox text-start',
    render: function () {
      return ''
    },
  },
  { data: 'company' },
  { data: 'symbol' },
  {
    data: 'price',
    render: (data: number) => {
      return `${currency}${data}`
    },
    className: 'text-start',
  },
  {
    data: 'change',
    render: (data: number) => {
      return `${data}%`
    },
    className: 'text-start',
  },
  { data: 'volume', className: 'text-start' },
  {
    data: 'marketCap',
    render: (data: string) => {
      return `${currency}${data}`
    },
  },
  {
    data: 'rating',
    render: (data: number) => {
      return `${data}★`
    },
  },
  {
    data: 'status',
    render: (data: string) => {
      const badgeClass = data === 'Bullish' ? 'success' : 'danger'
      return `<span class="badge badge-label badge-soft-${badgeClass}">${data}</span>`
    },
  },
]

const Example = () => {
  DataTable.use(DT)
  const tableRef = useRef<DataTableRef | null>(null)

  const selectAllRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (tableRef.current && selectAllRef.current) {
      selectAllRef.current.addEventListener('change', () => {
        if (selectAllRef.current?.checked) {
          tableRef.current?.dt()?.rows({ search: 'applied' }).select()
        } else {
          tableRef.current?.dt()?.rows().deselect()
        }
      })

      tableRef.current?.dt()?.on('select deselect', function () {
        const totalRows = tableRef.current?.dt()?.rows({ search: 'applied' }).count()
        const selectedRows = tableRef.current?.dt()?.rows({ selected: true, search: 'applied' }).count()
        if (selectAllRef.current) {
          selectAllRef.current.checked = selectedRows === totalRows
        }
      })
    }
  }, [])

  return (
    <ComponentCard title="Example">
      <DataTable
        ref={tableRef}
        data={tableData.body}
        columns={columns}
        options={{
          select: {
            style: 'multi',
            selector: 'td:first-child',
            className: 'selected',
          },
          order: [[1, 'asc']],
          responsive: true,
          columnDefs: [
            {
              orderable: false,
              render: DT.render.select(),
              targets: 0,
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
        className="table table-striped dt-responsive dt-select-checkbox align-middle mb-0">
        <thead className="thead-sm text-uppercase fs-xxs">
          <tr>
            <th className="fs-sm">
              <input ref={selectAllRef} type="checkbox" className="form-check-input" />
            </th>
            <th>Company</th>
            <th>Symbol</th>
            <th>Price</th>
            <th>Change</th>
            <th>Volume</th>
            <th>Market Cap</th>
            <th>Rating</th>
            <th>Status</th>
          </tr>
        </thead>
      </DataTable>
    </ComponentCard>
  )
}

const Index = () => {
  return (
    <Container fluid>
      <PageBreadcrumb title="Checkbox Select" subtitle="Data Tables" />

      <Row className="justify-content-center">
        <Col xxl={12}>
          <Example />
        </Col>
      </Row>
    </Container>
  )
}

export default Index
