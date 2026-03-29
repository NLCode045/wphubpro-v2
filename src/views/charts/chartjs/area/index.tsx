
import { Col, Container, Row } from 'react-bootstrap'
import CustomChartJs from '@/components/CustomChartJs.tsx'
import ComponentCard from '@/components/cards/ComponentCard'

import { Filler, LineController, LineElement, PointElement } from 'chart.js'
import { getBasicAreaChart, getBoundedAreaChart, getDifferentDatasetChart, getDrawTimeChart, getStackedAreaChart } from './data.ts'
import PageBreadcrumb from '@/components/PageBreadcrumb'

const Index = () => {
  return (
    <Container fluid>
      <PageBreadcrumb title="Area Charts" subtitle="Charts" />
      <Row>
        <Col xl={6}>
          <ComponentCard title="Basic Area">
            <div className="mt-3">
              <CustomChartJs type="line" getOptions={getBasicAreaChart} plugins={[LineController]} height={300} />
            </div>
          </ComponentCard>
        </Col>

        <Col xl={6}>
          <ComponentCard title="Different Dataset">
            <div className="mt-3">
              <CustomChartJs type="line" getOptions={getDifferentDatasetChart} plugins={[LineController]} height={300} />
            </div>
          </ComponentCard>
        </Col>

        <Col xl={6}>
          <ComponentCard title="Stacked">
            <div className="mt-3">
              <CustomChartJs type="line" getOptions={getStackedAreaChart} plugins={[LineController]} height={300} />
            </div>
          </ComponentCard>
        </Col>

        <Col xl={6}>
          <ComponentCard title="Boundaries">
            <div className="mt-3">
              <CustomChartJs type="line" getOptions={getBoundedAreaChart} plugins={[LineController]} height={300} />
            </div>
          </ComponentCard>
        </Col>

        <Col xl={6}>
          <ComponentCard title="Draw Time">
            <div className="mt-3">
              <CustomChartJs
                type="line"
                getOptions={getDrawTimeChart}
                plugins={[LineController, LineElement, PointElement, Filler]}
                height={300}
              />
            </div>
          </ComponentCard>
        </Col>
      </Row>
    </Container>
  )
}

export default Index
