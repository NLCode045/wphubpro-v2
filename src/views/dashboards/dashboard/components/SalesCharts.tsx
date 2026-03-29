
import { Card, Row, CardBody, Col } from 'react-bootstrap'
import {Link} from "react-router";
import { TbArrowRight } from 'react-icons/tb'
import ChartJsClient from '@/components/CustomChartJs.tsx'
import { salesAnalyticsChart, totalSalesChart } from '@/views/dashboards/dashboard/data'
import { ArcElement, BarController, BarElement, LineController, LineElement, PieController, PointElement } from 'chart.js'

const SalesCharts = () => {
  return (
    <Card>
      <CardBody className="p-0">
        <Row className="g-0">
          <Col xxl={3} xl={6} className="order-xl-1 order-xxl-0">
            <div className="p-3 border-end border-dashed">
              <h4 className="card-title mb-0">Total Sales</h4>
              <p className="text-muted fs-xs">You have 21 pending orders awaiting fulfillment.</p>

              <Row className="mt-4">
                <Col lg={12}>
                  <ChartJsClient type={'doughnut'} getOptions={totalSalesChart} height={300}
                                 plugins={[PieController, ArcElement]} />
                </Col>
              </Row>
            </div>
            <hr className="d-xxl-none border-light m-0" />
          </Col>
          <Col xxl={9} className="order-xl-3 order-xxl-1">
            <div className="px-4 py-3">
              <div className="d-flex justify-content-between mb-3">
                <h4 className="card-title">Sales Analytics</h4>
                <Link to="" className="link-reset text-decoration-underline fw-semibold link-offset-3">
                  View Reports <TbArrowRight />
                </Link>
              </div>

              <div dir="ltr">
                <ChartJsClient type={'bar'} getOptions={salesAnalyticsChart} height={330}  plugins={[BarController,BarElement,PointElement,LineElement,LineController]}/>
              </div>
            </div>
          </Col>
        </Row>
      </CardBody>
    </Card>
  )
}

export default SalesCharts
