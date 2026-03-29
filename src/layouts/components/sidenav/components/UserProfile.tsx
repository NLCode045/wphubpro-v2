import { userDropdownItems } from '@/layouts/components/data'
import { ROUTE_PATHS } from '@/config/routePaths'
import { useAuth } from '@/domains/auth'
import { Link, useNavigate } from 'react-router'
import { Fragment } from 'react'
import { Dropdown, DropdownDivider, DropdownItem, DropdownMenu, DropdownToggle } from 'react-bootstrap'
import { TbSettings } from 'react-icons/tb'

import user3 from '@/assets/images/users/user-3.jpg'

const UserProfile = () => {
  const { logout, user } = useAuth()
  const navigate = useNavigate()

  const displayName = user?.name?.trim() || user?.email || 'Account'

  const handleLogout = async () => {
    await logout()
    navigate(ROUTE_PATHS.LOGIN, { replace: true })
  }

  return (
    <div className="sidenav-user">
      <div className="d-flex justify-content-between align-items-center">
        <div>
          <Link to="/" className="link-reset">
            <img src={user3} alt="user-image" width="36" height="36" className="rounded-circle mb-2 avatar-md" />
            <span className="sidenav-user-name fw-bold">{displayName}</span>
            <span className="fs-12 fw-semibold" data-lang="user-role">
              Art Director
            </span>
          </Link>
        </div>
        <Dropdown>
          <DropdownToggle
            as={'a'}
            role="button"
            aria-label="profile dropdown"
            className="dropdown-toggle drop-arrow-none link-reset sidenav-user-set-icon">
            <TbSettings className="fs-24 align-middle ms-1" />
          </DropdownToggle>

          <DropdownMenu>
            {userDropdownItems.map((item, idx) => (
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
    </div>
  )
}

export default UserProfile
