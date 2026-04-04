import { ROUTE_PATHS } from '@/config/routePaths'
import { useDashboardNav } from '@/context/DashboardNavContext'
import { horizontalAdminMenuItems, horizontalMenuItems } from '@/layouts/components/data'
import type { MenuItemType } from '@/types/layout'
import {Link, useLocation} from "react-router";
import { Fragment } from 'react'
import { Dropdown, DropdownMenu, DropdownToggle } from 'react-bootstrap'
import { TbChevronDown } from 'react-icons/tb'

function menuPathActive(url: string | undefined, pathname: string): boolean {
  if (!url) return false
  if (pathname === url) return true
  if (url === ROUTE_PATHS.ADMIN_DASHBOARD) return false
  return pathname.startsWith(`${url}/`)
}

const MenuItemWithChildren = ({
  item,
  wrapperClass,
  togglerClass,
  level,
}: {
  item: MenuItemType
  wrapperClass?: string
  togglerClass?: string
  level?: number
}) => {
  const menuLevel = level ?? 1
  const {pathname} = useLocation()

  const isChildActive = (items: MenuItemType[]): boolean =>
    items.some((child) => {
      if (child.url && menuPathActive(child.url, pathname)) return true
      if (child.children) return isChildActive(child.children)
      return false
    })

  const isActive = isChildActive(item.children || [])

  return (
    <Dropdown as={menuLevel > 1 ? 'div' : 'li'} drop={menuLevel > 1 ? 'end' : 'down'} className={`${wrapperClass ?? ''} ${isActive ? 'active' : ''}`}>
      <DropdownToggle as={'a'} className={`${togglerClass} dropdown-toggle drop-arrow-none ${isActive ? 'active' : ''}`}>
        {item.icon && (
          <span className="menu-icon">
            <item.icon />
          </span>
        )}
        <span className="menu-text"> {item.label} </span>
        {item.badge && <span className={`badge bg-${item.badge.variant} ms-auto `}>{item.badge.text}</span>}
        <TbChevronDown className="menu-arrow" />
      </DropdownToggle>
      <DropdownMenu>
        {(item.children || []).map((child, idx) => (
          <Fragment key={idx}>
            {child.children ? (
              <MenuItemWithChildren item={child} togglerClass="dropdown-item" level={menuLevel + 1} />
            ) : (
              <MenuItem item={child} linkClass="dropdown-item" level={menuLevel + 1} />
            )}
          </Fragment>
        ))}
      </DropdownMenu>
    </Dropdown>
  )
}

const MenuItem = ({ item, linkClass, wrapperClass, level }: { item: MenuItemType; linkClass?: string; wrapperClass?: string; level?: number }) => {
  const menuLevel = level ?? 1
  const { pathname } = useLocation()
  const isActive = item.url ? menuPathActive(item.url, pathname) : false

  const link = (
    <Link to={item.url ?? '/'} className={`${linkClass ?? ''} ${isActive ? 'active' : ''}`}>
      {item.icon && (
        <span className="menu-icon">
          <item.icon />
        </span>
      )}
      <span className="menu-text">{item.label}</span>
      {item.badge && <span className={`badge text-bg-${item.badge.variant} opacity-50`}>{item.badge.text}</span>}
    </Link>
  )

  return menuLevel > 1 ? link : <li className={`${wrapperClass ?? ''} ${isActive ? 'active' : ''}`}>{link}</li>
}

const AppMenu = () => {
  const { mode } = useDashboardNav()
  const items = mode === 'admin' ? horizontalAdminMenuItems : horizontalMenuItems

  return (
    <div className="collapse navbar-collapse">
      <ul className="navbar-nav">
        {items.map((item, idx) => (
          <Fragment key={idx}>
            {item.children ? (
              <MenuItemWithChildren item={item} wrapperClass="nav-item" togglerClass="nav-link" />
            ) : (
              <MenuItem item={item} linkClass="nav-link" wrapperClass="nav-item" />
            )}
          </Fragment>
        ))}
      </ul>
    </div>
  )
}

export default AppMenu
