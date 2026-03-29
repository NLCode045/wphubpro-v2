import { Card, CardBody, ProgressBar } from 'react-bootstrap'
import type { StatisticType } from '@/views/dashboards/dashboard2/data'

const StatisticWidget = ({ item }: { item: StatisticType }) => {
  const { title, progress, icon: Icon, subtitle, variant, count } = item
  return (
    <Card>
      <CardBody>
        <div className="d-flex justify-content-between align-items-start">
          <div className="avatar avatar-lg flex-shrink-0">
            <span className={`avatar-title bg-${variant}-subtle text-${variant} rounded fs-24`}>
              <Icon />
            </span>
          </div>
          <div className="text-end">
            <h4 className="mb-0">{count}</h4>
            <p className="mb-0 text-muted">{title}</p>
          </div>
        </div>
        <div className="mt-4">
          <div className="d-flex justify-content-between mb-1">
            <span className="text-muted fs-xs fw-semibold">{subtitle}</span>
            <span className="text-muted">{progress}%</span>
          </div>
          <ProgressBar now={progress} variant={variant} style={{ height: '6px' }} />
        </div>
      </CardBody>
    </Card>
  )
}

export default StatisticWidget
