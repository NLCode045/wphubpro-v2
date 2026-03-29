import {TbChecklist, TbClipboardList, TbClockHour4, TbUserCog} from 'react-icons/tb'
import type {IconType} from 'react-icons'
import {getColor} from '@/helpers/color.ts'
import type {ApexOptions} from 'apexcharts'

import product1 from '@/assets/images/products/1.png'
import product2 from '@/assets/images/products/2.png'
import product4 from '@/assets/images/products/4.png'
import product5 from '@/assets/images/products/5.png'
import product6 from '@/assets/images/products/6.png'

import user1 from '@/assets/images/users/user-1.jpg'
import user2 from '@/assets/images/users/user-2.jpg'
import user4 from '@/assets/images/users/user-4.jpg'
import user5 from '@/assets/images/users/user-5.jpg'
import user6 from '@/assets/images/users/user-6.jpg'

import deFlag from '@/assets/images/flags/de.svg'
import frFlag from '@/assets/images/flags/fr.svg'
import inFlag from '@/assets/images/flags/in.svg'
import usFlag from '@/assets/images/flags/us.svg'
import gbFlag from '@/assets/images/flags/gb.svg'
import caFlag from '@/assets/images/flags/ca.svg'
import jpFlag from '@/assets/images/flags/jp.svg'
import auFlag from '@/assets/images/flags/au.svg'

export type StatisticType = {
  icon: IconType
  title: string
  subtitle: string
  count: number
  variant: 'info' | 'success' | 'warning' | 'danger'
  progress: number
}

export type CountryDataType = {
  rank: number
  code: string
  name: string
  flag: string
  trend: { value: number; type: 'success' | 'danger' | 'warning' }
  activeProjects: number
  projectName: string
}

function generateRandomData(count: number, min: number, max: number) {
  return Array.from({ length: count }, () => Math.floor(Math.random() * (max - min + 1)) + min)
}

function generateSessionAndPageViewData(count: number) {
  const sessions = generateRandomData(count, 250, 450)
  const pageViews = sessions.map(
    (session) => Math.floor(session * (2 + Math.random() * 0.1)), // Page Views are 2x to 2.5x of Sessions
  )
  return { sessions, pageViews }
}

function generateData(baseval: number, count: number, yrange: any) {
  let i = 0
  const series = []
  while (i < count) {
    const x = Math.floor(Math.random() * (750 - 1 + 1)) + 1
    const y = Math.floor(Math.random() * (yrange.max - yrange.min + 1)) + yrange.min
    const z = Math.floor(Math.random() * (75 - 15 + 1)) + 15

    series.push([x, y, z])
    baseval += 86400000
    i++
  }
  return series
}

const { sessions, pageViews } = generateSessionAndPageViewData(19)

export const stats: StatisticType[] = [
  {
    icon: TbClipboardList,
    title: 'Active Projects',
    subtitle: 'PROGRESS',
    count: 28,
    variant: 'info',
    progress: 75,
  },
  {
    icon: TbChecklist,
    title: 'Tasks Completed',
    subtitle: 'TARGET',
    count: 124,
    variant: 'success',
    progress: 88,
  },
  {
    icon: TbClockHour4,
    title: 'Pending Tasks',
    subtitle: 'DEADLINES',
    count: 16,
    variant: 'warning',
    progress: 42,
  },
  {
    icon: TbUserCog,
    title: 'Project Managers',
    subtitle: 'ALLOCATED',
    count: 9,
    variant: 'danger',
    progress: 100,
  },
]

export const products = [
  {
    id: 1,
    image: product1,
    name: 'Smart Watch',
    category: 'Wearables',
    stock: '120 units',
    price: '$89.99',
    ratings: 4,
    reviews: 45,
    status: 'Active',
    statusVariant: 'success',
  },
  {
    id: 2,
    image: product2,
    name: 'Bluetooth Speaker',
    category: 'Audio',
    stock: '75 units',
    price: '$39.50',
    ratings: 3,
    reviews: 20,
    status: 'Low Stock',
    statusVariant: 'warning',
  },
  {
    id: 3,
    image: product4,
    name: 'Gaming Mouse',
    category: 'Accessories',
    stock: '0 units',
    price: '$24.99',
    ratings: 5,
    reviews: 14,
    status: 'Out of Stock',
    statusVariant: 'danger',
  },
  {
    id: 4,
    image: product5,
    name: '4K Action Camera',
    category: 'Cameras',
    stock: '60 units',
    price: '$149.00',
    ratings: 4,
    reviews: 31,
    status: 'Active',
    statusVariant: 'success',
  },
  {
    id: 5,
    image: product6,
    name: 'Fitness Tracker Band',
    category: 'Wearables',
    stock: '220 units',
    price: '$34.95',
    ratings: 4.5,
    reviews: 18,
    status: 'Active',
    statusVariant: 'success',
  },
]

export const orders = [
  {
    id: 'ORD-1001',
    userImage: user1,
    userName: 'John Doe',
    product: 'Smart Watch',
    date: '2025-04-29',
    amount: '$89.99',
    status: 'Delivered',
    statusVariant: 'success',
  },
  {
    id: 'ORD-1002',
    userImage: user2,
    userName: 'Emma Watson',
    product: 'Bluetooth Speaker',
    date: '2025-04-28',
    amount: '$39.50',
    status: 'Pending',
    statusVariant: 'warning',
  },
  {
    id: 'ORD-1003',
    userImage: user4,
    userName: 'Liam Johnson',
    product: 'Smart Watch',
    date: '2025-04-27',
    amount: '$89.99',
    status: 'Completed',
    statusVariant: 'success',
  },
  {
    id: 'ORD-1004',
    userImage: user6,
    userName: 'Olivia Brown',
    product: 'Gaming Mouse',
    date: '2025-04-26',
    amount: '$24.99',
    status: 'Cancelled',
    statusVariant: 'danger',
  },
  {
    id: 'ORD-1005',
    userImage: user5,
    userName: 'Noah Smith',
    product: 'Fitness Tracker Band',
    date: '2025-04-25',
    amount: '$34.95',
    status: 'Completed',
    statusVariant: 'success',
  },
]

export const projectOverviewChart: () => ApexOptions = () => ({
  chart: {
    height: 330,
    type: 'area',
    toolbar: { show: false },
  },
  dataLabels: {
    enabled: false,
  },
  stroke: {
    width: 2,
    curve: 'smooth',
  },
  colors: [getColor('chart-primary'), getColor('secondary')],
  series: [
    {
      name: 'Sessions',
      data: sessions,
    },
    {
      name: 'Page Views',
      data: pageViews,
    },
  ],
  legend: {
    offsetY: 5,
  },
  xaxis: {
    categories: [
      '',
      '8 AM',
      '9 AM',
      '10 AM',
      '11 AM',
      '12 PM',
      '1 PM',
      '2 PM',
      '3 PM',
      '4 PM',
      '5 PM',
      '6 PM',
      '7 PM',
      '8 PM',
      '9 PM',
      '10 PM',
      '11 PM',
      '12 AM',
      '',
    ],
    axisBorder: { show: false },
    axisTicks: { show: false },
    tickAmount: 6,
    labels: {
      style: {
        fontSize: '12px',
      },
    },
  },
  tooltip: {
    shared: true,
    y: {
      formatter: function (val, { seriesIndex }) {
        if (seriesIndex === 0) {
          return val + ' Sessions'
        } else if (seriesIndex === 1) {
          return val + ' Page Views'
        }
        return val.toString()
      },
    },
  },
  fill: {
    type: 'gradient',
    gradient: {
      shadeIntensity: 1,
      opacityFrom: 0.4,
      opacityTo: 0.2,
      stops: [15, 120, 100],
    },
  },
  grid: {
    borderColor: getColor('border-color'),
    padding: {
      bottom: 0,
    },
  },
})

export const taskProgressChart: () => ApexOptions = () => ({
  chart: {
    height: 330, // Increased height for spacing
    type: 'bubble',
    toolbar: {
      show: false,
    },
  },
  dataLabels: {
    enabled: false,
  },
  series: [
    {
      name: 'Bubble 1',
      data: generateData(new Date('11 Feb 2017 GMT').getTime(), 10, {
        min: 10,
        max: 60,
      }),
    },
    {
      name: 'Bubble 2',
      data: generateData(new Date('11 Feb 2017 GMT').getTime(), 10, {
        min: 10,
        max: 60,
      }),
    },
    {
      name: 'Bubble 3',
      data: generateData(new Date('11 Feb 2017 GMT').getTime(), 10, {
        min: 10,
        max: 60,
      }),
    },
  ],
  fill: {
    opacity: 0.8,
  },
  colors: [getColor('chart-primary'), getColor('secondary'), getColor('danger')],
  xaxis: {
    tickAmount: 12,
    type: 'category',
  },
  yaxis: {
    max: 70,
  },
  grid: {
    borderColor: getColor('border-color'),
    padding: {
      top: -20,
      right: 0,
      bottom: -5,
      left: 10,
    },
  },
  legend: {
    offsetY: 7,
  },
})

export const countriesData: CountryDataType[] = [
  {
    rank: 1,
    code: 'in',
    name: 'India',
    flag: inFlag,
    trend: { value: 3.2, type: 'success' },
    activeProjects: 8,
    projectName: 'E-Commerce Revamp',
  },
  {
    rank: 2,
    code: 'de',
    name: 'Germany',
    flag: deFlag,
    trend: { value: 1.5, type: 'success' },
    activeProjects: 5,
    projectName: 'POS Upgrade',
  },
  {
    rank: 3,
    code: 'fr',
    name: 'France',
    flag: frFlag,
    trend: { value: 0.8, type: 'danger' },
    activeProjects: 4,
    projectName: 'Mobile App',
  },
  {
    rank: 4,
    code: 'us',
    name: 'United States',
    flag: usFlag,
    trend: { value: 2.1, type: 'success' },
    activeProjects: 10,
    projectName: 'SaaS Dashboard',
  },
  {
    rank: 5,
    code: 'gb',
    name: 'United Kingdom',
    flag: gbFlag,
    trend: { value: 1.2, type: 'danger' },
    activeProjects: 3,
    projectName: 'CRM System',
  },
  {
    rank: 6,
    code: 'ca',
    name: 'Canada',
    flag: caFlag,
    trend: { value: 0.9, type: 'success' },
    activeProjects: 4,
    projectName: 'Inventory Tool',
  },
  {
    rank: 7,
    code: 'jp',
    name: 'Japan',
    flag: jpFlag,
    trend: { value: 0, type: 'warning' },
    activeProjects: 6,
    projectName: 'Retail App',
  },
  {
    rank: 8,
    code: 'au',
    name: 'Australia',
    flag: auFlag,
    trend: { value: 1.1, type: 'success' },
    activeProjects: 2,
    projectName: 'HR Platform',
  },

]
