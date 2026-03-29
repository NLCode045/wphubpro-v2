
import ComponentCard from '@/components/cards/ComponentCard'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import { Col, Container, Row } from 'react-bootstrap'

import DataTables from 'datatables.net'
import DT from 'datatables.net-bs5'
import DataTable from 'datatables.net-react'

import ReactDOMServer from 'react-dom/server'
import { TbChevronLeft, TbChevronRight, TbChevronsLeft, TbChevronsRight } from 'react-icons/tb'

import arFlag from '@/assets/images/flags/ar.svg'
import auFlag from '@/assets/images/flags/au.svg'
import deFlag from '@/assets/images/flags/de.svg'
import gbFlag from '@/assets/images/flags/gb.svg'
import inFlag from '@/assets/images/flags/in.svg'
import jpFlag from '@/assets/images/flags/jp.svg'
import usFlag from '@/assets/images/flags/us.svg'

const columns = [
  { data: 'name' },
  {
    data: 'position',
    render: function (data: any, type: any) {
      if (type === 'display') {
        let link = 'https://datatables.net'

        if (data[0] < 'H') {
          link = 'https://cloudtables.com'
        } else if (data[0] < 'S') {
          link = 'https://editor.datatables.net'
        }

        return '<a href="' + link + '">' + data + '</a>'
      }

      return data
    },
  },
  {
    data: 'office',
    render: function (data: any, type: any) {
      if (type === 'display') {
        const flagMap: any = {
          Argentina: arFlag,
          Gujarat: inFlag,
          Germany: deFlag,
          London: gbFlag,
          'New York': usFlag,
          'San Francisco': usFlag,
          Sydney: auFlag,
          Tokyo: jpFlag,
        }

        return `<span class="flag">
                  <img class="avatar-xs rounded me-2" src="${flagMap[data]}" alt="${data}" />
                </span> ${data}`
      }

      return data
    },
    className: 'f32',
  },
  {
    data: 'extn',
    render: function (data: any, type: any) {
      return type === 'display'
        ? `<div class="progress" role="progressbar" aria-label="Basic example" aria-valuenow="${data}" aria-valuemin="0" aria-valuemax="9999" style="height:8px">
              <div class="progress-bar" style="width: ${(data / 9999) * 100}%"></div>
            </div>`
        : data
    },
  },
  {
    data: 'start_date',
  },
  {
    data: 'salary',
    render: function (data: any, type: any) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      const number = DataTables.render.number(',', '.', 2, '$').display(data)

      if (type === 'display') {
        let color = 'green'
        if (data < 250000) {
          color = 'red'
        } else if (data < 500000) {
          color = 'orange'
        }

        return `<span style="color:${color}">${number}</span>`
      }

      return number
    },
  },
]

const Example = () => {
  DataTable.use(DT)
  return (
    <ComponentCard title="Example">
      <DataTable
        ajax="/data/datatables-rendering.json"
        columns={columns}
        options={{
          processing: true,
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
            <th>Name</th>
            <th>Position</th>
            <th>Office</th>
            <th>Progress</th>
            <th>Start date</th>
            <th>Salary</th>
          </tr>
        </thead>
      </DataTable>
    </ComponentCard>
  )
}

const Index = () => {
  return (
    <Container fluid>
      <PageBreadcrumb title="Data Rendering" subtitle="Data Tables" />

      <Row className="justify-content-center">
        <Col xxl={12}>
          <Example />
        </Col>
      </Row>
    </Container>
  )
}

export default Index
