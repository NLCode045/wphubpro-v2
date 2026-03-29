import user1 from '@/assets/images/users/user-1.jpg'
import user2 from '@/assets/images/users/user-2.jpg'
import user3 from '@/assets/images/users/user-3.jpg'
import user4 from '@/assets/images/users/user-4.jpg'
import user5 from '@/assets/images/users/user-5.jpg'
import user6 from '@/assets/images/users/user-6.jpg'
import user7 from '@/assets/images/users/user-7.jpg'
import user8 from '@/assets/images/users/user-8.jpg'
import user9 from '@/assets/images/users/user-9.jpg'
import user10 from '@/assets/images/users/user-10.jpg'


import { getColor } from '@/helpers/color'
import type { ApexOptions } from 'apexcharts'
import type { IconType } from 'react-icons'
import { TbAlertTriangle, TbChecks, TbCodeDots, TbServer2 } from 'react-icons/tb'

export type StatisticsWidgetType = {
  icon: IconType
  variant: string
  title: string
  value: string
  chartOptions?: () => ApexOptions
}

export type TicketType = {
  id: string
  requestedBy: string
  requestedByImg: string
  subject: string
  agent: string
  agentImg: string
  priority: 'Low' | 'Medium' | 'High' | 'Urgent'
  status: 'Open' | 'Pending' | 'Resolved' | 'Closed' | 'Escalated' | 'In Progress'
  createdAt: string
  createdAtTime: string
  dueDate: string
}


const sparklineConfig: (data: number[], color: string) => ApexOptions = (data, color) => ({
  chart: {
    type: 'area',
    height: 60,
    sparkline: { enabled: true },
  },
  stroke: {
    curve: 'smooth',
    width: 2,
  },
  series: [{ data }],
  colors: [color],
  tooltip: {
    enabled: false,
  },
})

const dummyNewUsers = [
  Math.sin(0) * 50 + 500,
  Math.sin(1) * 60 + 500,
  Math.sin(2) * 70 + 500,
  Math.sin(3) * 80 + 500,
  Math.sin(4) * 90 + 500,
  Math.sin(5) * 100 + 500,
  Math.sin(6) * 110 + 500,
]

const dummyActiveUsers = [
  89000 + Math.sin(0) * 500,
  89200 + Math.sin(1) * 600,
  89700 + Math.sin(2) * 700,
  90500 + Math.sin(3) * 800,
  91000 + Math.sin(4) * 900,
  91300 + Math.sin(5) * 1000,
  92000 + Math.sin(6) * 1100,
]

const dummyBlockedUsers = [
  2600 + Math.sin(0) * 10,
  2605 + Math.sin(1) * 12,
  2610 + Math.sin(2) * 15,
  2608 + Math.sin(3) * 18,
  2612 + Math.sin(4) * 20,
]

const dummyTables = [7000 + Math.sin(0) * 150, 7100 + Math.sin(1) * 160, 7200 + Math.sin(2) * 170, 7400 + Math.sin(3) * 180, 7850 + Math.sin(4) * 200]

export const apiStatistics: StatisticsWidgetType[] = [
  {
    title: 'Total API Calls',
    value: '1,254,300',
    icon: TbServer2,
    variant: 'success',
    chartOptions: () => sparklineConfig(dummyNewUsers, getColor('secondary')),
  },
  {
    title: 'Successful Conversions',
    value: '1,192,450',
    icon: TbChecks,
    variant: 'success',
    chartOptions: () => sparklineConfig(dummyActiveUsers, getColor('warning')),
  },
  {
    title: 'Failed Requests',
    value: '61,850',
    icon: TbAlertTriangle,
    variant: 'danger',
    chartOptions: () => sparklineConfig(dummyBlockedUsers, getColor('info')),
  },
  {
    title: 'Active Endpoints',
    value: '143',
    icon: TbCodeDots,
    variant: 'info',
    chartOptions: () => sparklineConfig(dummyTables, getColor('danger')),
  },
]

export const tickets: TicketType[] = [
  {
    id: '#SUP-2451',
    requestedBy: 'Emily Clark',
    requestedByImg: user3,
    subject: 'Unable to login with 2FA',
    agent: 'Daniel Ray',
    agentImg: user2,
    priority: 'High',
    status: 'Pending',
    createdAt: '04 Aug, 2025',
    createdAtTime: '11:30 AM',
    dueDate: '08 Aug, 2025',
  },
  {
    id: '#SUP-2517',
    requestedBy: 'Lucas Graham',
    requestedByImg: user9,
    subject: 'Cannot upload profile image',
    agent: 'Sarah Lee',
    agentImg: user1,
    priority: 'Medium',
    status: 'In Progress',
    createdAt: '05 Aug, 2025',
    createdAtTime: '2:05 PM',
    dueDate: '10 Aug, 2025',
  },
  {
    id: '#SUP-2518',
    requestedBy: 'Nina Patel',
    requestedByImg: user4,
    subject: 'Incorrect invoice total shown',
    agent: 'Alex Morgan',
    agentImg: user8,
    priority: 'High',
    status: 'Pending',
    createdAt: '05 Aug, 2025',
    createdAtTime: '10:42 AM',
    dueDate: '07 Aug, 2025',
  },
  {
    id: '#SUP-2519',
    requestedBy: 'Michael Foster',
    requestedByImg: user6,
    subject: 'Website not loading on Safari',
    agent: 'Jessica Hughes',
    agentImg: user5,
    priority: 'Low',
    status: 'Resolved',
    createdAt: '04 Aug, 2025',
    createdAtTime: '6:20 PM',
    dueDate: '06 Aug, 2025',
  },
  {
    id: '#SUP-2520',
    requestedBy: 'Isabella Reed',
    requestedByImg: user7,
    subject: 'Cannot change account email',
    agent: 'Daniel Ray',
    agentImg: user2,
    priority: 'Medium',
    status: 'In Progress',
    createdAt: '03 Aug, 2025',
    createdAtTime: '9:50 AM',
    dueDate: '08 Aug, 2025',
  },
  {
    id: '#SUP-2521',
    requestedBy: 'Olivia White',
    requestedByImg: user1,
    subject: "Can't access dashboard after update",
    agent: 'James Carter',
    agentImg: user9,
    priority: 'High',
    status: 'Escalated',
    createdAt: '05 Aug, 2025',
    createdAtTime: '7:45 AM',
    dueDate: '06 Aug, 2025',
  },
  {
    id: '#SUP-2522',
    requestedBy: 'Emma King',
    requestedByImg: user10,
    subject: 'Feature request: export as PDF',
    agent: 'Harper Wells',
    agentImg: user3,
    priority: 'Low',
    status: 'Closed',
    createdAt: '01 Aug, 2025',
    createdAtTime: '4:10 PM',
    dueDate: '05 Aug, 2025',
  },
  {
    id: '#SUP-2523',
    requestedBy: 'Ava Sullivan',
    requestedByImg: user1,
    subject: 'App freezes when uploading files',
    agent: 'Liam Brooks',
    agentImg: user4,
    priority: 'High',
    status: 'Pending',
    createdAt: '05 Aug, 2025',
    createdAtTime: '1:20 PM',
    dueDate: '09 Aug, 2025',
  },
  {
    id: '#SUP-2524',
    requestedBy: 'Sophie Bennett',
    requestedByImg: user3,
    subject: 'Missing transaction history',
    agent: 'Lucas Shaw',
    agentImg: user6,
    priority: 'Medium',
    status: 'In Progress',
    createdAt: '04 Aug, 2025',
    createdAtTime: '4:30 PM',
    dueDate: '08 Aug, 2025',
  },
  {
    id: '#SUP-2525',
    requestedBy: 'Noah Allen',
    requestedByImg: user4,
    subject: 'Feedback form submission error',
    agent: 'Sophia Reed',
    agentImg: user5,
    priority: 'Low',
    status: 'Resolved',
    createdAt: '03 Aug, 2025',
    createdAtTime: '12:00 PM',
    dueDate: '06 Aug, 2025',
  },
  {
    id: '#SUP-2526',
    requestedBy: 'Ethan James',
    requestedByImg: user5,
    subject: "Can't generate report summary",
    agent: 'Chloe Adams',
    agentImg: user7,
    priority: 'High',
    status: 'Escalated',
    createdAt: '05 Aug, 2025',
    createdAtTime: '8:50 AM',
    dueDate: '07 Aug, 2025',
  },
  {
    id: '#SUP-2527',
    requestedBy: 'Grace Carter',
    requestedByImg: user8,
    subject: 'Feature request: Dark mode toggle',
    agent: 'Daniel Ray',
    agentImg: user2,
    priority: 'Low',
    status: 'Closed',
    createdAt: '02 Aug, 2025',
    createdAtTime: '5:25 PM',
    dueDate: '06 Aug, 2025',
  },
]