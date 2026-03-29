
import ComponentCard from '@/components/cards/ComponentCard'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import { Col, Container, Row } from 'react-bootstrap'

import DT from 'datatables.net-bs5'
import DataTable from 'datatables.net-react'

import ReactDOMServer from 'react-dom/server'
import { TbChevronLeft, TbChevronRight, TbChevronsLeft, TbChevronsRight } from 'react-icons/tb'

import { dataSet } from '@/views/tables/data-tables/javascript-source/data'
import { currency } from '@/helpers'

const columns = [
  { title: 'company' },
  { title: 'symbol' },
  {
    title: 'price',
    render: (data: number) => {
      return `${currency}${data}`
    },
    className: 'text-start',
  },
  {
    title: 'change',
    className: 'text-start',
  },
  { title: 'volume', className: 'text-start' },
  {
    title: 'market cap',
    render: (data: string) => {
      return `${currency}${data}`
    },
  },
  { title: 'rating' },
  {
    title: 'status',
    render: (data: string) => {
      const badgeClass = data === 'Bullish' ? 'success' : 'danger'
      return `<span class="badge badge-label badge-soft-${badgeClass}">${data}</span>`
    },
  },
]

const Example = () => {
  DataTable.use(DT)
  return (
    <ComponentCard title="Example">
      <DataTable
        columns={columns}
        options={{
          data: dataSet,
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
      <PageBreadcrumb title="Javascript Source" subtitle="Data Tables" />

      <Row className="justify-content-center">
        <Col xxl={12}>
          <Example />
        </Col>
      </Row>
    </Container>
  )
}

export default Index
