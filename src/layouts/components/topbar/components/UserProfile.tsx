import { userDropdownItems } from '@/layouts/components/data'
import { ROUTE_PATHS } from '@/config/routePaths'
import { useAuth } from '@/domains/auth'

import { Link, useNavigate } from 'react-router'
import { Fragment } from 'react'
import { Dropdown, DropdownDivider, DropdownItem, DropdownMenu, DropdownToggle } from 'react-bootstrap'
import { TbChevronDown } from 'react-icons/tb'

import user3 from '@/assets/images/users/user-3.jpg'

const UserProfile = () => {
  const { logout, user, isAdmin } = useAuth()
  const navigate = useNavigate()

  const displayName = user?.name?.trim() || user?.email || 'Account'

  const handleLogout = async () => {
    await logout()
    navigate(ROUTE_PATHS.LOGIN, { replace: true })
  }

  return (
    <div className="topbar-item nav-user">
      <Dropdown align="end">
        <DropdownToggle as={'a'} className="topbar-link dropdown-toggle drop-arrow-none px-2">
          <img src={user3} width="32" height="32" className="rounded-circle me-lg-2 d-flex" alt="user-image" />
          <div className="d-lg-flex align-items-center gap-1 d-none">
            <h5 className="my-0">{displayName}</h5>
            <TbChevronDown className="align-middle" />
          </div>
        </DropdownToggle>
        <DropdownMenu className="dropdown-menu-end">
          {userDropdownItems
            .filter((item) => !item.adminOnly || isAdmin)
            .map((item, idx) => (
            <Fragment key={idx}>
              {item.isHeader ? (
                <div className="dropdown-header noti-title">
                  <h6 className="text-overflow m-0">{item.label}</h6>
                </div>
              ) : item.isDivider ? (
                <DropdownDivider />
              ) : item.isLogout ? (
                <DropdownItem as="button" type="button" className={item.class} onClick={() => void handleLogout()}>
                  {item.icon && <item.icon className="me-2 fs-17 align-middle" />}
                  <span className="align-middle">{item.label}</span>
                </DropdownItem>
              ) : (
                <DropdownItem as={Link} to={item.url ?? ''} className={item.class}>
                  {item.icon && <item.icon className="me-2 fs-17 align-middle" />}
                  <span className="align-middle">{item.label}</span>
                </DropdownItem>
              )}
            </Fragment>
          ))}
        </DropdownMenu>
      </Dropdown>
    </div>
  )
}

export default UserProfile
