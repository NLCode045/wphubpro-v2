import { Card, CardBody, CardHeader, CardTitle, Dropdown, DropdownItem, DropdownMenu, DropdownToggle } from 'react-bootstrap'
import { TbBug, TbCheck, TbDotsVertical, TbRocket, TbTrash } from 'react-icons/tb'
import {Link} from "react-router";
import type { RequestType } from '@/views/apps/social-feed/types'

import user3 from '@/assets/images/users/user-3.jpg'
import user6 from '@/assets/images/users/user-6.jpg'


const requests: RequestType[] = [
  {
    avatar: user3,
    title: 'Emily Zhang',
    description: 'requested to collaborate on your design project.',
    badge: { text: 'New', className: 'bg-primary' },
    time: '2 minutes ago',
    action: 'Accept',
  },
  {
    icon: TbRocket,
    iconBg: 'text-bg-info',
    title: 'New Feature:',
    description: 'Suggestion for dark mode support.',
    badge: { text: 'Pending', className: 'bg-warning text-dark' },
    time: '10 minutes ago',
    action: 'Review',
  },
  {
    avatar: user6,
    title: 'Client Feedback:',
    description: 'John Doe left a review on your dashboard.',
    badge: { text: 'Feedback', className: 'bg-secondary' },
    time: '30 minutes ago',
    action: 'Respond',
  },
  {
    icon: TbBug,
    iconBg: 'text-bg-primary',
    title: 'Bug Report:',
    description: 'Login form issue on Safari mobile.',
    badge: { text: 'Urgent', className: 'bg-danger' },
    time: '1 hour ago',
    action: 'View',
  },
]

const Requests = () => {
  return (
    <Card>
      <CardHeader className="justify-content-between align-items-center border-dashed">
        <CardTitle className="mb-0">Requests</CardTitle>
        <Dropdown>
          <DropdownToggle variant="link" className="text-muted drop-arrow-none card-drop p-0">
            <TbDotsVertical className="fs-lg" />
          </DropdownToggle>
          <DropdownMenu align="end">
            <DropdownItem as={Link} to="">
              <TbCheck className="me-2" />
              Mark All as Read
            </DropdownItem>
            <DropdownItem as={Link} to="">
              <TbTrash className="me-2" />
              Clear All
            </DropdownItem>
          </DropdownMenu>
        </Dropdown>
      </CardHeader>

      <CardBody>
        {requests.map((item, idx) => (
          <div key={idx} className={`d-flex justify-content-between align-items-center ${idx !== requests.length - 1 ? 'mb-3' : ''}`}>
            <div className={`d-flex align-items-start ${item.icon ? 'gap-2' : ''}`}>
              {item.avatar ? (
                <img src={item.avatar} alt={item.title} width={32} height={32} className="avatar-xs rounded-circle me-2" />
              ) : (
                <div className="avatar-xs flex-shrink-0">
                  <span className={`avatar-title rounded-circle ${item.iconBg}`}>{item.icon && <item.icon />}</span>
                </div>
              )}

              <div>
                <p className="mb-1">
                  <strong>{item.title}</strong> {item.description}
                  <span className={`badge ms-1 ${item.badge.className}`}>{item.badge.text}</span>
                </p>
                <small className="text-muted">{item.time}</small>
              </div>
            </div>

            <button className="btn btn-sm py-0 px-1 btn-default">{item.action}</button>
          </div>
        ))}
      </CardBody>
    </Card>
  )
}

export default Requests
