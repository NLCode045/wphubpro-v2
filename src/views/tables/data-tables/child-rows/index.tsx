
import ComponentCard from '@/components/cards/ComponentCard'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import { useEffect, useRef } from 'react'
import { Col, Container, Row } from 'react-bootstrap'

import DT from 'datatables.net-bs5'
import DataTable, {type  DataTableRef } from 'datatables.net-react'
import 'datatables.net-responsive'

import ReactDOMServer from 'react-dom/server'
import { TbChevronLeft, TbChevronRight, TbChevronsLeft, TbChevronsRight } from 'react-icons/tb'

import { currency } from '@/helpers'

const columns = [
  {
    className: 'dt-control dt-child-rows-btn',
    orderable: false,
    data: null,
    defaultContent: '<i class="ti ti-square-rounded-plus-filled text-primary align-middle fs-22"></i>',
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
]

const formatRowDetails = (d: any) => {
  return `
    <div class="row align-items-center">
      <div class="col-md-4">
        <h5 class="fs-base mb-1">Rating:</h5>
        <div>${d.rating}</div>
      </div>
      <div class="col-md-4">
        <h5 class="fs-base mb-1">Status:</h5>
        <span class="badge badge-label ${d.status === 'Bullish' ? 'badge-soft-success' : 'badge-soft-danger'}">${d.status}</span>
      </div>
      <div class="col-md-4">
        <h5 class="fs-base mb-1">Extra info:</h5>
        <div>And any further details here (images etc)...</div>
      </div>
    </div>
  `
}

const Example = () => {
  DataTable.use(DT)

  const tableRef = useRef<DataTableRef | null>(null)

  useEffect(() => {
    if (tableRef.current) {
      const onClick = (e: any) => {
        const tr = e.target.closest('tr')
        if (!tr) return
        const row = tableRef.current!.dt()?.row(tr)
        if (row?.child.isShown()) {
          row?.child.hide()
        } else {
          row?.child(formatRowDetails(row.data())).show()
        }
      }

      tableRef.current.dt()?.on('click', onClick)
    }
  }, [])

  return (
    <ComponentCard title="Example">
      <DataTable
        ref={tableRef}
        ajax="/data/datatables.json"
        columns={columns}
        options={{
          order: [[1, 'asc']],
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
            <th></th>
            <th>Company</th>
            <th>Symbol</th>
            <th>Price</th>
            <th>Change</th>
            <th>Volume</th>
            <th>Market Cap</th>
          </tr>
        </thead>
      </DataTable>
    </ComponentCard>
  )
}

const Index = () => {
  return (
    <Container fluid>
      <PageBreadcrumb title="Child Row" subtitle="Data Tables" />

      <Row className="justify-content-center">
        <Col xxl={12}>
          <Example />
        </Col>
      </Row>
    </Container>
  )
}

export default Index
