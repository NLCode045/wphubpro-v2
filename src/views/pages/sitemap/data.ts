import type {IconType} from 'react-icons'
import {
    TbCalendar,
    TbChartBar,
    TbHelp,
    TbLayoutDashboard,
    TbLock,
    TbLogout,
    TbMail,
    TbNotebook,
    TbSettings,
    TbUser,
    TbUserPlus,
    TbUsers,
    TbWallet
} from 'react-icons/tb'

type SubPage = {
  label: string
  url: string
}

type PageItemType = {
  label: string
  url: string
  icon: IconType
  children?: SubPage[]
}

export const dashboardSitemap: PageItemType[] = [
  {
    label: 'Dashboards',
    url: '/dashboards',
    icon: TbLayoutDashboard,
    children: [
      { label: 'Analytics', url: '/dashboards/analytics' },
      { label: 'CRM', url: '/dashboards/crm' },
      { label: 'Sales', url: '/dashboards/sales' },
      { label: 'Minimal', url: '/dashboards/minimal' },
      { label: 'eCommerce', url: '/dashboards/ecommerce' },
    ],
  },
  {
    label: 'Profile',
    url: '/profile',
    icon:TbUser,
    children: [
      { label: 'Overview', url: '/profile/overview' },
      { label: 'Edit', url: '/profile/edit' },
      { label: 'Security', url: '/profile/security' },
    ],
  },
  { label: 'Help Center', url: '/help-center', icon: TbHelp},
  { label: 'Login', url: '/login', icon: TbLock },
  { label: 'Register', url: '/register', icon: TbUserPlus },
]

export const applications: PageItemType[] = [
  { label: 'Calendar', url: '/apps/calendar', icon: TbCalendar },
  {
    label: 'Email',
    url: '/apps/email',
    icon: TbMail,
    children: [
      { label: 'Inbox', url: '/apps/email/inbox' },
      { label: 'Read', url: '/apps/email/read' },
      { label: 'Compose', url: '/apps/email/compose' },
    ],
  },
  {
    label: 'Users',
    url: '/apps/users',
    icon: TbUsers,
    children: [
      { label: 'List', url: '/apps/users/list' },
      { label: 'Add User', url: '/apps/users/add' },
      { label: 'Roles', url: '/apps/users/roles' },
    ],
  },
  {
    label: 'Projects',
    url: '/apps/projects',
    icon: TbNotebook,
    children: [
      { label: 'Overview', url: '/apps/projects/overview' },
      { label: 'Create', url: '/apps/projects/create' },
      { label: 'Tasks', url: '/apps/projects/tasks' },
    ],
  },
]

export const reportsSettings: PageItemType[] = [
  {
    label: 'Reports',
    url: '/reports',
    icon: TbChartBar,
    children: [
      { label: 'Sales', url: '/reports/sales' },
      { label: 'Users', url: '/reports/users' },
      { label: 'Performance', url: '/reports/performance' },
    ],
  },
  {
    label: 'Billing',
    url: '/billing',
    icon:TbWallet,
    children: [
      { label: 'Invoices', url: '/billing/invoices' },
      { label: 'Payments', url: '/billing/payments' },
      { label: 'Methods', url: '/billing/methods' },
    ],
  },
  {
    label: 'Settings',
    url: '/settings',
    icon: TbSettings,
    children: [
      { label: 'General', url: '/settings/general' },
      { label: 'Appearance', url: '/settings/appearance' },
      { label: 'Integrations', url: '/settings/integrations' },
      { label: 'Audit Logs', url: '/settings/audit-logs' },
    ],
  },
  {
    label: 'Logout',
    url: '/logout',
    icon: TbLogout,
  },
]