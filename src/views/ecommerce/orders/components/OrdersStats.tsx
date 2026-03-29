import { type OrderStatisticsType, orderStats } from '@/views/ecommerce/orders/data'
import { Card, CardBody, Col, Row } from 'react-bootstrap'
import CountUp from "react-countup";

const StatCard = ({ item }: { item: OrderStatisticsType }) => {
  return (
    <Card className="mb-1">
      <CardBody>
        <div className="d-flex align-items-center justify-content-between gap-2 mb-3">
          <h3 className="mb-0">
            <CountUp end={item.count} prefix={item.prefix} suffix={item.suffix} />
          </h3>
          <div className="avatar-md flex-shrink-0">
            <span className={`avatar-title text-bg-${item.variant} rounded-circle fs-22`}>
              <item.icon />
            </span>
          </div>
        </div>
        <p className="mb-0 text-uppercase fs-xs fw-bold">
          {item.title}
          <span className={`float-end badge badge-soft-${item.variant}`}>{item.change}%</span>
        </p>
      </CardBody>
    </Card>
  )
}

const OrdersStats = () => {
  return (
    <Row className="row-cols-xxl-5 row-cols-md-3 row-cols-1 align-items-center g-1">
      {orderStats.map((item, idx) => (
        <Col key={idx}>
          <StatCard item={item} />
        </Col>
      ))}
    </Row>
  )
}

export default OrdersStats
