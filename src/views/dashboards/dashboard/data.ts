import { TbCreditCard, TbRotateClockwise2, TbShoppingCart, TbUsers } from 'react-icons/tb'
import type { IconType } from 'react-icons'
import { getColor } from '@/helpers/color.ts'
import type { ChartJSOptionsType } from '@/types'

import product1 from '@/assets/images/products/1.png'
import product2 from '@/assets/images/products/2.png'
import product3 from '@/assets/images/products/3.png'
import product4 from '@/assets/images/products/4.png'
import product5 from '@/assets/images/products/5.png'
import product6 from '@/assets/images/products/6.png'
import product7 from '@/assets/images/products/7.png'
import product8 from '@/assets/images/products/8.png'
import product9 from '@/assets/images/products/9.png'

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



export type StatCardType = {
  id: number
  title: string
  value: number
  suffix?: string
  prefix?: string
  icon: IconType
  iconBg?: string
}

export type ProductType = {
  id: number
  image: string
  name: string
  category: string
  stock: string
  price: string
  ratings: number
  reviews: number
  status: string
  statusVariant: 'success' | 'warning' | 'danger'
}

export type OrderType = {
  id: string
  userImage: string
  userName: string
  product: string
  date: string
  amount: string
  status: string
  statusVariant: 'success' | 'warning' | 'danger'
}

export const statCards: StatCardType[] = [
  {
    id: 1,
    title: 'Total Sales',
    value: 124.7,
    suffix: 'K',
    prefix: '$',
    icon: TbCreditCard,
    iconBg: 'primary',
  },
  {
    id: 2,
    title: 'Orders Placed',
    value: 2358,
    icon: TbShoppingCart,
    iconBg: 'success',
  },
  {
    id: 3,
    title: 'Active Customers',
    value: 839,
    icon: TbUsers,
    iconBg: 'info',
  },
  {
    id: 4,
    title: 'Refund Requests',
    value: 41,
    icon: TbRotateClockwise2,
    iconBg: 'warning',
  },
]

export const totalSalesChart: () => ChartJSOptionsType = () => ({
  type: 'doughnut',
  data: {
    labels: ['Online Store', 'Retail Stores', 'B2B Revenue', 'Marketplace Revenue'],
    datasets: [
      {
        label: '2024',
        data: [300, 150, 100, 80],
        backgroundColor: [getColor('chart-primary'), getColor('chart-secondary'), getColor('chart-dark'), getColor('chart-gray')],
        borderColor: 'transparent',
        borderWidth: 1,
        weight: 1, // Outer ring
        cutout: '30%',
        radius: '90%',
      },
      {
        label: '2023',
        data: [270, 135, 90, 72],
        backgroundColor: [
          getColor('chart-primary-rgb', 0.3),
          getColor('chart-secondary-rgb', 0.3),
          getColor('chart-dark-rgb', 0.3),
          getColor('chart-gray-rgb', 0.3),
        ],
        borderColor: 'transparent',
        borderWidth: 3,
        weight: 0.8, // Inner ring
        cutout: '30%',
        radius: '60%', // smaller to create spacing
      },
    ],
  },
  options: {
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          font: { family: getComputedStyle(document.body).fontFamily },
          color: getColor('secondary-color'),
          usePointStyle: true, // Show circles instead of default box
          pointStyle: 'circle', // Circle shape
          boxWidth: 8, // Circle size
          boxHeight: 8, // (optional) same as width by default
          padding: 15, // Space between legend items
        },
      },
      tooltip: {
        callbacks: {
          label: function (ctx) {
            return `${ctx.dataset.label} - ${ctx.label}: ${ctx.parsed}`
          },
        },
      },
    },
    scales: {
      x: { display: false },
      y: { display: false },
    },
  },
})

const generateRandomData = (min: number, max: number) => Array.from({ length: 12 }, () => Math.floor(Math.random() * (max - min + 1)) + min)

const onlineSales = generateRandomData(1000, 1250)
const inStoreSales = generateRandomData(800, 1250)

const totalSales = generateRandomData(2500, 3500)

export const salesAnalyticsChart: () => ChartJSOptionsType = () => ({
  data: {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    datasets: [
      {
        type: 'bar',
        label: 'Online Sales',
        data: onlineSales,
        borderColor: getColor('chart-primary'),
        backgroundColor: getColor('chart-primary'),
        stack: 'sales',
        barThickness: 20,
        borderRadius: 6,
      },
      {
        type: 'bar',
        label: 'In-store Sales',
        data: inStoreSales,
        borderColor: getColor('chart-gray'),
        backgroundColor: getColor('chart-gray'),
        stack: 'sales',
        barThickness: 20,
        borderRadius: 6,
      },
      {
        type: 'line',
        label: 'Projected Sales',
        data: totalSales,
        borderColor: getColor('chart-dark'),
        backgroundColor: getColor('chart-dark-rgb', 0.2),
        borderWidth: 2,
        borderDash: [5, 5], // dashed line
        tension: 0.4,
        fill: false,
        yAxisID: 'y',
      },
    ],
  },
})

export const products: ProductType[] = [
  {
    id: 1,
    image: product1,
    name: 'Wireless Earbuds',
    category: 'Audio',
    stock: '180 units',
    price: '$59.90',
    ratings: 4,
    reviews: 52,
    status: 'Active',
    statusVariant: 'success',
  },
  {
    id: 2,
    image: product2,
    name: 'Laptop Stand',
    category: 'Accessories',
    stock: '45 units',
    price: '$29.00',
    ratings: 3,
    reviews: 11,
    status: 'Low Stock',
    statusVariant: 'warning',
  },
  {
    id: 3,
    image: product3,
    name: 'Drone Camera',
    category: 'Gadgets',
    stock: '0 units',
    price: '$199.99',
    ratings: 4.5,
    reviews: 8,
    status: 'Out of Stock',
    statusVariant: 'danger',
  },
  {
    id: 4,
    image: product4,
    name: 'Portable Projector',
    category: 'Electronics',
    stock: '32 units',
    price: '$120.00',
    ratings: 3,
    reviews: 16,
    status: 'Limited',
    statusVariant: 'warning',
  },
  {
    id: 5,
    image: product5,
    name: 'Smartphone G12',
    category: 'Mobiles',
    stock: '85 units',
    price: '$499.00',
    ratings: 4,
    reviews: 112,
    status: 'Active',
    statusVariant: 'success',
  },
  {
    id: 6,
    image: product6,
    name: 'Noise Cancelling Headphones',
    category: 'Audio',
    stock: '25 units',
    price: '$129.99',
    ratings: 4.5,
    reviews: 78,
    status: 'Low Stock',
    statusVariant: 'warning',
  },
  {
    id: 7,
    image: product7,
    name: 'Mini Air Purifier',
    category: 'Home Tech',
    stock: '0 units',
    price: '$49.99',
    ratings: 3.5,
    reviews: 34,
    status: 'Out of Stock',
    statusVariant: 'danger',
  },
  {
    id: 8,
    image: product8,
    name: 'USB-C Docking Station',
    category: 'Accessories',
    stock: '142 units',
    price: '$89.00',
    ratings: 5,
    reviews: 64,
    status: 'Active',
    statusVariant: 'success',
  },
  {
    id: 9,
    image: product9,
    name: 'Digital Photo Frame',
    category: 'Gadgets',
    stock: '58 units',
    price: '$74.95',
    ratings: 4,
    reviews: 40,
    status: 'Active',
    statusVariant: 'success',
  },
]

export const orders: OrderType[] = [
  {
    id: 'ORD-2001',
    userImage: user1,
    userName: 'Alice Cooper',
    product: 'Noise Cancelling Headphones',
    date: '2025-05-01',
    amount: '$199.99',
    status: 'Delivered',
    statusVariant: 'success',
  },
  {
    id: 'ORD-2002',
    userImage: user2,
    userName: 'David Lee',
    product: '4K Monitor',
    date: '2025-04-30',
    amount: '$349.00',
    status: 'Pending',
    statusVariant: 'warning',
  },
  {
    id: 'ORD-2003',
    userImage: user3,
    userName: 'Sophia Turner',
    product: 'Mechanical Keyboard',
    date: '2025-04-29',
    amount: '$89.49',
    status: 'Completed',
    statusVariant: 'success',
  },
  {
    id: 'ORD-2004',
    userImage: user4,
    userName: 'James Wilson',
    product: 'Drone Camera',
    date: '2025-04-28',
    amount: '$450.00',
    status: 'Cancelled',
    statusVariant: 'danger',
  },
  {
    id: 'ORD-2005',
    userImage: user5,
    userName: 'Ava Carter',
    product: 'Wireless Earbuds',
    date: '2025-04-27',
    amount: '$129.99',
    status: 'Completed',
    statusVariant: 'success',
  },
  {
    id: 'ORD-2011',
    userImage: user6,
    userName: 'Ethan Brooks',
    product: 'VR Headset',
    date: '2025-05-02',
    amount: '$299.00',
    status: 'Completed',
    statusVariant: 'success',
  },
  {
    id: 'ORD-2012',
    userImage: user7,
    userName: 'Mia Clarke',
    product: 'Portable Charger',
    date: '2025-05-01',
    amount: '$59.99',
    status: 'Completed',
    statusVariant: 'success',
  },
  {
    id: 'ORD-2013',
    userImage: user8,
    userName: 'Lucas Perry',
    product: 'Smartphone Gimbal',
    date: '2025-04-30',
    amount: '$149.99',
    status: 'Pending',
    statusVariant: 'warning',
  },
  {
    id: 'ORD-2014',
    userImage: user9,
    userName: 'Chloe Adams',
    product: 'LED Desk Lamp',
    date: '2025-04-29',
    amount: '$45.00',
    status: 'Delivered',
    statusVariant: 'success',
  },
  {
    id: 'ORD-2015',
    userImage: user10,
    userName: 'Benjamin Gray',
    product: 'Noise Meter',
    date: '2025-04-28',
    amount: '$75.49',
    status: 'Delivered',
    statusVariant: 'success',
  },
]
