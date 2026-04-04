import { ROUTE_PATHS } from '@/config/routePaths'
import { type MenuItemType } from '@/types/layout'
import { type IconType } from 'react-icons'
import {
  TbCoin,
  TbLayoutDashboard,
  TbLibrary,
  TbLifeBuoy,
  TbListDetails,
  TbLogout2,
  TbPackages,
  TbSettings,
  TbUserCircle,
  TbUsers,
  TbWallet,
  TbWorld,
} from 'react-icons/tb'

type UserDropdownItemType = {
  label?: string
  icon?: IconType
  url?: string
  isDivider?: boolean
  isHeader?: boolean
  /** When true, `UserProfile` runs Appwrite logout instead of navigating. */
  isLogout?: boolean
  /** If true, only shown to admins (support queue, etc.). */
  adminOnly?: boolean
  class?: string
}

export const userDropdownItems: UserDropdownItemType[] = [
  {
    label: 'Welcome back!',
    isHeader: true,
  },
  {
    label: 'Profile',
    icon: TbUserCircle,
    url: ROUTE_PATHS.PROFILE,
  },
  {
    label: 'Support',
    icon: TbLifeBuoy,
    url: ROUTE_PATHS.SUPPORT,
  },
  {
    label: 'Support queue',
    icon: TbLifeBuoy,
    url: ROUTE_PATHS.ADMIN_SUPPORT,
    adminOnly: true,
  },
  {
    label: 'Log Out',
    icon: TbLogout2,
    isLogout: true,
    class: 'text-danger fw-semibold',
  },
]

export const menuItems: MenuItemType[] = [
  { key: 'navigation', label: 'Navigation', isTitle: true },
  {
    key: 'dashboard',
    label: 'Dashboard',
    icon: TbLayoutDashboard,
    url: '/dashboard',
  },
  {
    key: 'sites',
    label: 'Sites',
    icon: TbWorld,
    url: '/sites',
  },
  {
    key: 'library',
    label: 'Library',
    icon: TbLibrary,
    url: '/library',
  },
  {
    key: 'support',
    label: 'Support',
    icon: TbLifeBuoy,
    url: ROUTE_PATHS.SUPPORT,
  },
]

export const horizontalMenuItems: MenuItemType[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    icon: TbLayoutDashboard,
    url: '/dashboard',
  },
  {
    key: 'sites',
    label: 'Sites',
    icon: TbWorld,
    url: '/sites',
  },
  {
    key: 'library',
    label: 'Library',
    icon: TbLibrary,
    url: '/library',
  },
  {
    key: 'support',
    label: 'Support',
    icon: TbLifeBuoy,
    url: ROUTE_PATHS.SUPPORT,
  },
]

/** Sidebar + horizontal nav when an admin is in admin mode (expand later). */
export const adminMenuItems: MenuItemType[] = [
  { key: 'admin-navigation', label: 'Admin', isTitle: true },
  {
    key: 'admin-dashboard',
    label: 'Dashboard',
    icon: TbLayoutDashboard,
    url: ROUTE_PATHS.ADMIN_DASHBOARD,
  },
  {
    key: 'admin-users',
    label: 'Users',
    icon: TbUsers,
    url: ROUTE_PATHS.ADMIN_USERS,
  },
  {
    key: 'admin-settings',
    label: 'Platform settings',
    icon: TbSettings,
    url: ROUTE_PATHS.ADMIN_SETTINGS,
  },
  {
    key: 'admin-finance',
    label: 'Finance',
    icon: TbCoin,
    children: [
      {
        key: 'admin-finance-dashboard',
        label: 'Dashboard',
        icon: TbLayoutDashboard,
        url: ROUTE_PATHS.ADMIN_FINANCE_DASHBOARD,
      },
      {
        key: 'admin-finance-subscriptions',
        label: 'Subscriptions',
        icon: TbListDetails,
        url: ROUTE_PATHS.ADMIN_FINANCE_SUBSCRIPTIONS,
      },
      {
        key: 'admin-finance-plans',
        label: 'Plans',
        icon: TbPackages,
        url: ROUTE_PATHS.ADMIN_FINANCE_PLANS,
      },
      {
        key: 'admin-finance-payments',
        label: 'Payments',
        icon: TbWallet,
        url: ROUTE_PATHS.ADMIN_FINANCE_PAYMENTS,
      },
    ],
  },
  {
    key: 'admin-support',
    label: 'Support',
    icon: TbLifeBuoy,
    url: ROUTE_PATHS.ADMIN_SUPPORT,
  },
]

export const horizontalAdminMenuItems: MenuItemType[] = [
  {
    key: 'admin-dashboard',
    label: 'Dashboard',
    icon: TbLayoutDashboard,
    url: ROUTE_PATHS.ADMIN_DASHBOARD,
  },
  {
    key: 'admin-users',
    label: 'Users',
    icon: TbUsers,
    url: ROUTE_PATHS.ADMIN_USERS,
  },
  {
    key: 'admin-settings',
    label: 'Settings',
    icon: TbSettings,
    url: ROUTE_PATHS.ADMIN_SETTINGS,
  },
  {
    key: 'admin-finance',
    label: 'Finance',
    icon: TbCoin,
    children: [
      {
        key: 'admin-finance-dashboard',
        label: 'Dashboard',
        icon: TbLayoutDashboard,
        url: ROUTE_PATHS.ADMIN_FINANCE_DASHBOARD,
      },
      {
        key: 'admin-finance-subscriptions',
        label: 'Subscriptions',
        icon: TbListDetails,
        url: ROUTE_PATHS.ADMIN_FINANCE_SUBSCRIPTIONS,
      },
      {
        key: 'admin-finance-plans',
        label: 'Plans',
        icon: TbPackages,
        url: ROUTE_PATHS.ADMIN_FINANCE_PLANS,
      },
      {
        key: 'admin-finance-payments',
        label: 'Payments',
        icon: TbWallet,
        url: ROUTE_PATHS.ADMIN_FINANCE_PAYMENTS,
      },
    ],
  },
  {
    key: 'admin-support',
    label: 'Support',
    icon: TbLifeBuoy,
    url: ROUTE_PATHS.ADMIN_SUPPORT,
  },
]
