import { Card, CardBody, ProgressBar } from 'react-bootstrap'
import type { DealWidgetType } from '@/views/apps/crm/types'

const DealWidget = ({item}:{item:DealWidgetType}) => {
  const {count,change,icon:Icon,title,progress,variant} = item
  return (
    <Card className="mb-2">
      <CardBody>
        <div className="mb-3 d-flex justify-content-between align-items-center">
          <h5 className="fs-xl mb-0">{count}</h5>
          <span>
            {change} <Icon className={`text-${variant}`} />
          </span>
        </div>
        <p className="text-muted mb-2">{title}</p>

        <ProgressBar now={progress} className="progress-sm mb-0" variant={variant} />
      </CardBody>
    </Card>
  )
}

export default DealWidget
