import {Card, CardBody} from 'react-bootstrap'
import {TbInfoHexagonFilled, TbPointFilled} from 'react-icons/tb'
import {type SellerStatisticType} from '@/views/ecommerce/sellers/[sellerId]/data'
import CountUp from "react-countup";

const SellerStatisticCard = ({ item }: { item: SellerStatisticType }) => {
  const { count, totalCount, description, variant, title, icon: Icon } = item
  return (
    <Card>
      <CardBody>
        <div className='d-flex justify-content-between'>
        <h5 title="Number of Tasks">{title}</h5>
        <p  className="mb-0 fs-lg">
          <TbInfoHexagonFilled className="text-muted" />
        </p>
        </div>
        <div className="d-flex align-items-center gap-2 my-2">
          <div className="avatar-md flex-shrink-0">
            <span className={`avatar-title text-bg-${variant} bg-opacity-90 rounded-circle fs-22 d-flex align-items-center justify-content-center`}>
              {Icon && <Icon className="d-flex align-items-center" />}
            </span>
          </div>
          <h3 className="mb-0">
            <CountUp prefix={count.prefix} suffix={count.suffix} end={count.value} duration={1} enableScrollSpy scrollSpyOnce />
          </h3>
        </div>
        <p className="d-flex align-items-center gap-1 mb-0">
          <TbPointFilled className={`text-${variant}`} />
          <span className="text-nowrap text-muted"> {description}</span>
          <span className="ms-auto">
            <b>{totalCount}</b>
          </span>
        </p>
      </CardBody>
    </Card>
  )
}
export default SellerStatisticCard
