import { Card, CardBody, Dropdown, DropdownDivider, DropdownItem, DropdownMenu, DropdownToggle } from 'react-bootstrap'

import {Link} from "react-router";

import user3 from '@/assets/images/users/user-3.jpg'
import usFlag from '@/assets/images/flags/us.svg'
import { TbBell, TbBook, TbCalendarEvent, TbDotsVertical, TbHome, TbLayoutGrid, TbMessageCircle, TbSettings, TbTag, TbUsers } from 'react-icons/tb'
import type { IconType } from 'react-icons'
import clsx from 'clsx'

type MenuItem = {
  label: string
  link: string
  icon: IconType
  badge?: { text: string; variant: string }
}

type CategoryType = {
  label: string
  link: string
  variant: string
}

const mainMenu: MenuItem[] = [
  { label: 'News Feed', link: '', icon: TbHome },
  { label: 'Messages', link: '', icon: TbMessageCircle, badge: { text: '5', variant: 'danger' } },
  { label: 'Friends', link: '', icon: TbUsers },
  { label: 'Notifications', link: '', icon: TbBell, badge: { text: '12', variant: 'warning' } },
  { label: 'Groups', link: '', icon: TbLayoutGrid },
  { label: 'Pages', link: '', icon: TbBook },
  { label: 'Events', link: '', icon: TbCalendarEvent },
  { label: 'Settings', link: '', icon: TbSettings },
]

const categories: CategoryType[] = [
  { label: 'Technology', link: '',variant: 'primary' },
  { label: 'Travel', link: '', variant: 'success' },
  { label: 'Lifestyle', link: '', variant: 'danger' },
  { label: 'Photography', link: '', variant: 'info' },
]

const SocialProfile = () => {
  return (
    <Card className="card-top-sticky">
      <CardBody>
        <div className="d-flex align-items-center mb-3">
          <div className="me-2 position-relative">
            <img src={user3} alt="avatar" className="rounded" width="42" height="42" />
          </div>
          <div>
            <h5 className="mb-0 d-flex align-items-center">
              <Link to="/users/profile" className="link-reset">
                Geneva Lee
              </Link>
              <img src={usFlag} alt="US" className="ms-2 rounded-circle" height="16" />
            </h5>
            <p className="text-muted mb-0">Content Creator</p>
          </div>
          <div className="ms-auto">
            <Dropdown>
              <DropdownToggle className="btn btn-icon btn-ghost-light text-muted drop-arrow-none" data-bs-toggle="dropdown">
                <TbDotsVertical className="fs-xl" />
              </DropdownToggle>
              <DropdownMenu align="end" className="dropdown-menu-end">
                <li>
                  <DropdownItem as={Link} to="">
                    View Profile
                  </DropdownItem>
                </li>
                <li>
                  <DropdownItem as={Link} to="">
                    Send Message
                  </DropdownItem>
                </li>
                <li>
                  <DropdownItem as={Link} to="">
                    Copy Profile Link
                  </DropdownItem>
                </li>
                <li>
                  <DropdownDivider />
                </li>
                <li>
                  <DropdownItem as={Link} to="">
                    Edit Profile
                  </DropdownItem>
                </li>
                <li>
                  <a className="dropdown-item text-danger" href="#">
                    Block User
                  </a>
                </li>
                <li>
                  <a className="dropdown-item text-danger" href="#">
                    Report User
                  </a>
                </li>
              </DropdownMenu>
            </Dropdown>
          </div>
        </div>

        <div className="list-group list-group-flush list-custom mt-3">
          {mainMenu.map((item, idx) => (
            <Link to={item.link} className={clsx('list-group-item list-group-item-action',{'active':idx === 0})} key={idx}>
              <item.icon className="me-1 opacity-75 fs-lg align-middle"></item.icon>
              <span className="align-middle">{item.label}</span>
              {item.badge && (
                <span className={`badge bg-${item.badge.variant}-subtle align-middle fs-xxs text-danger float-end`}>{item.badge.text}</span>
              )}
            </Link>
          ))}

          <div className="list-group-item mt-2">
            <span className="align-middle">Categories</span>
          </div>

          {categories.map((category, idx) => (
            <Link to={category.link} className="list-group-item list-group-item-action" key={idx}>
              <TbTag className={`me-1 align-middle fs-sm text-${category.variant}`} />
              <span className="align-middle">{category.label}</span>
            </Link>
          ))}
        </div>
      </CardBody>
    </Card>
  )
}

export default SocialProfile
