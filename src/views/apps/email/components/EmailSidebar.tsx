import { emailSidebarMenu } from '@/views/apps/email/data'
import clsx from 'clsx'
import {Link} from "react-router";
import { TbChartDonutFilled } from 'react-icons/tb'
import SimpleBar from "simplebar-react";

const EmailSidebar = () => {
  const labels: { name: string; variant: string }[] = [
    { name: 'Business', variant: 'primary' },
    { name: 'Personal', variant: 'purple' },
    { name: 'Friends', variant: 'info' },
    { name: 'Family', variant: 'warning' },
  ]
  return (
    <SimpleBar className="card h-100 mb-0 rounded-end-0">
      <div className="card-body">
        <Link to="/email-compose" className="btn btn-danger fw-medium w-100">
          Compose
        </Link>
        <div className="list-group list-group-flush list-custom mt-3">
          {emailSidebarMenu.map(({ badge, link, label, icon: Icon }, idx) => (
            <Link to={link} className={clsx('list-group-item list-group-item-action', { active: idx === 0 })} key={idx}>
              <Icon className="me-2 opacity-75 fs-lg align-middle" />
              <span className="align-middle">{label}</span>
              {badge && <span className={`badge align-middle bg-${badge.variant}-subtle fs-xxs text-${badge.variant} float-end`}>{badge.text}</span>}
            </Link>
          ))}

          <div className="list-group-item mt-2">
            <span className="align-middle">Labels</span>
          </div>
          {labels.map(({ name, variant }, idx) => (
            <Link to="" className="list-group-item list-group-item-action" key={idx}>
              <TbChartDonutFilled className={`me-2 align-middle fs-sm text-${variant}`} />
              <span className="align-middle">{name}</span>
            </Link>
          ))}
        </div>
      </div>
    </SimpleBar>
  )
}

export default EmailSidebar
