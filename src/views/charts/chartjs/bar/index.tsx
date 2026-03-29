
import { Col, Container, Row } from 'react-bootstrap'
import CustomChartJs from '@/components/CustomChartJs.tsx'
import ComponentCard from '@/components/cards/ComponentCard'
import {
  getBasicBarChart,
  getBorderRadiusBarChart,
  getFloatingBarChart,
  getHorizontalBarChart,
  getStackedBarChart,
  getStackedGroupedBarChart,
  getVerticalBarChart,
} from './data.ts'
import { BarController, BarElement } from 'chart.js'
import PageBreadcrumb from '@/components/PageBreadcrumb'

const Index = () => {
  return (
    <Container fluid>
      <PageBreadcrumb title="Bar Charts" subtitle="Charts" />
      <Row>
        <Col xl={6}>
          <ComponentCard title="Basic Bar">
            <div className="mt-3">
              <CustomChartJs height={300} type="bar" getOptions={getBasicBarChart} plugins={[BarController, BarElement]} />
            </div>
          </ComponentCard>
        </Col>

        <Col xl={6}>
          <ComponentCard title="Border Radius">
            <div className="mt-3">
              <CustomChartJs height={300} type="bar" getOptions={getBorderRadiusBarChart} plugins={[BarController, BarElement]} />
            </div>
          </ComponentCard>
        </Col>

        <Col xl={6}>
          <ComponentCard title="Floating">
            <div className="mt-3">
              <CustomChartJs height={300} type="bar" getOptions={getFloatingBarChart} plugins={[BarController, BarElement]} />
            </div>
          </ComponentCard>
        </Col>

        <Col xl={6}>
          <ComponentCard title="Horizontal">
            <div className="mt-3">
              <CustomChartJs height={300} type="bar" getOptions={getHorizontalBarChart} plugins={[BarController, BarElement]} />
            </div>
          </ComponentCard>
        </Col>

        <Col xl={6}>
          <ComponentCard title="Stacked">
            <div className="mt-3">
              <CustomChartJs height={300} type="bar" getOptions={getStackedBarChart} plugins={[BarController, BarElement]} />
            </div>
          </ComponentCard>
        </Col>

        <Col xl={6}>
          <ComponentCard title="Stacked with Groups">
            <div className="mt-3">
              <CustomChartJs height={300} type="bar" getOptions={getStackedGroupedBarChart} plugins={[BarController, BarElement]} />
            </div>
          </ComponentCard>
        </Col>

        <Col xl={6}>
          <ComponentCard title="Vertical">
            <div className="mt-3">
              <CustomChartJs height={300} type="bar" getOptions={getVerticalBarChart} plugins={[BarController, BarElement]} />
            </div>
          </ComponentCard>
        </Col>
      </Row>
    </Container>
  )
}

export default Index
