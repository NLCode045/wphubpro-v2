import {
    TbAlertCircle,
    TbArrowUp,
    TbBellPlus,
    TbBox,
    TbChartPie,
    TbChecklist,
    TbClipboardList,
    TbClock,
    TbClockHour4,
    TbCreditCard,
    TbCurrencyDollar,
    TbEye,
    TbHeadset,
    TbRotateClockwise2,
    TbShoppingCart,
    TbStar,
    TbTrendingUp,
    TbUserCog,
    TbUsers
} from "react-icons/tb";
import type {
    CountriesType,
    ReportStatType,
    Widget1Type,
    Widget3Type,
    Widget4Type,
    Widget5Type,
    Widget6Type
} from "./types.ts";
import user1 from '@/assets/images/users/user-1.jpg'
import user2 from '@/assets/images/users/user-2.jpg'
import user3 from '@/assets/images/users/user-3.jpg'
import user4 from '@/assets/images/users/user-4.jpg'

import inFlags from '@/assets/images/flags/in.svg'
import deFlags from '@/assets/images/flags/de.svg'
import frFlags from '@/assets/images/flags/fr.svg'
import usFlags from '@/assets/images/flags/us.svg'
import gbFlags from '@/assets/images/flags/gb.svg'
import caFlags from '@/assets/images/flags/ca.svg'
import jpFlags from '@/assets/images/flags/jp.svg'
import auFlags from '@/assets/images/flags/au.svg'


export const Widget1Data: Widget1Type[] = [
  {
    icon: TbCreditCard,
    color: "primary",
    label: "Total Sales",
    count: { value: 124.70, prefix: '$', suffix: 'K' },
  },
  {
    icon: TbShoppingCart,
    color: "success",
    label: "Orders Placed",
    count: { value: 2358 },
  },
  {
    icon: TbUsers,
    color: "info",
    label: "Active Customers",
    count: { value: 839 },
  },
  {
    icon: TbRotateClockwise2,
    color: "warning",
    label: "Refund Requests",
    count: { value: 41 },
  }
]


export const Widget2Data: Widget1Type[] = [
  {
    icon: TbBellPlus,
    color: "secondary",
    label: "New Subscriptions",
    count: { value: 438 },
  },
  {
    icon: TbHeadset,
    color: "danger",
    label: "Support Tickets",
    count: { value: 108 },
  },
  {
    icon: TbChartPie,
    color: "dark",
    label: "Conversion Rate",
    count: { value: 3.70, suffix: '%' },
  },
  {
    icon: TbTrendingUp,
    color: "dark",
    label: "Revenue Growth",
    count: { value: 12.40, prefix: '+', suffix: '%' },
  }
]


export const Widget3Data: Widget3Type[] = [
  {
    title: "Orders",
    icon: TbShoppingCart,
    color: "success",
    value: 1250,
    label: "Total Orders",
    footerValue: '15320',
    color2: 'success'
  },
  {
    title: "Revenue",
    icon: TbCurrencyDollar,
    color: "warning",
    value: 98.7,
    unit: "k",
    prefix: "$",
    label: "Total Revenue",
    footerValue: '1.2',
    footerUnit: "M",
    color2: 'primary'
  },
  {
    title: "Ratings",
    icon: TbStar,
    color: "info",
    value: 4.8,
    label: "Average Rating",
    footerValue: "5k Reviews",
    color2: 'info'
  },
  {
    title: "Products",
    icon: TbBox,
    color: "secondary",
    value: 350,
    label: "Total Products",
    footerValue: "750 Variants",
    color2: 'secondary'
  }
]

export const Widget4Data: Widget4Type[] = [
  {
    title: "Listed Properties",
    value: 1245,
    label: "New This Month",
    labelValue: 120,
    trendColor: "success",
    trendValue: 5.2,
    info:'Total number of properties listed',
  },
  {
    title: "Sold Properties",
    value: 862,
    label: "This Year",
    labelValue: 308,
    trendColor: "success",
    trendValue: 7.9,
    info:'Properties successfully sold',
  },
  {
    title: "Rental Agreements",
    value: 573,
    label: "New Rentals",
    labelValue: 48,
    trendColor: "warning",
    trendValue: 2.3,
    info:'Active rental contracts',
  },
  {
    title: "Active Agents",
    value: 127,
    label: "On Duty",
    labelValue: 35,
    trendColor: "success",
    trendValue: 4.1,
     info:'Currently working agents',
  }
]

export const Widget5Data: Widget5Type[] = [
  {
    icon: TbClipboardList,
    color: "info",
    value: 28,
    label: "Active Projects",
    progressLabel: "PROGRESS",
    progressValue: 75,
  },
  {
    icon: TbChecklist,
    color: "success",
    value: 124,
    label: "Tasks Completed",
    progressLabel: "TARGET",
    progressValue: 88,
  },
  {
    icon: TbClockHour4,
    color: "warning",
    value: 16,
    label: "Pending Tasks",
    progressLabel: "DEADLINES",
    progressValue: 42,
  },
  {
    icon: TbUserCog,
    color: "danger",
    value: 9,
    label: "Project Managers",
    progressLabel: "ALLOCATED",
    progressValue: 100,
  }
]


export const Widget6Data: Widget6Type[] = [
  {
    name: "Ava Martinez",
    role: "Project Manager",
    image: user1,
    color: "success",
  },
  {
    name: "Liam Nguyen",
    role: "UI/UX Designer",
    image: user2,
    color: "warning",
  },
  {
    name: "Sophia Khan",
    role: "Marketing Lead",
    image: user3,
    color: "info",
  },
  {
    name: "Noah Patel",
    role: "Backend Developer",
    image: user4,
    color: "danger",
  }
]



export const reportStats: ReportStatType[] = [
  {
    title: "Total reports generated",
    value: 4320,
    percentage: 12.75,
    icon: TbArrowUp,
    percentageText: "12.75%",
    percentageColor: "success",
    description: "Total reports generated",
    progressColor: "secondary",
    bg: "default",
    border: "dashed",
  },
  {
    title: "Reports exported",
    value: 1280,
    percentage: 7.2,
    icon: TbArrowUp,
    percentageText: "7.20%",
    percentageColor: "success",
    description: "Reports exported",
    progressColor: "primary",
    bg: "primary bg-opacity-10",
    border: "primary dashed",
  },
  {
    title: "Errors found in reports",
    value: 157,
    percentage: 3.42,
    icon: TbAlertCircle,
    percentageText: "3.42%",
    percentageColor: "danger",
    description: "Errors found in reports",
    progressColor: "secondary",
    bg: "secondary bg-opacity-10",
    border: "secondary dashed",
  },
  {
    title: "Most viewed report",
    value: "Analytics Q2",
    percentage: 54.6,
    icon: TbEye,
    percentageText: "54.6%",
    percentageColor: "info",
    description: "Most viewed report",
    progressColor: "warning",
    bg: "warning bg-opacity-10",
    border: "warning dashed",
  },
  {
    title: "Avg. completion time",
    value: "3.8 mins",
    icon: TbClock,
    percentage: 1.65,
    percentageText: "1.65%",
    percentageColor: "warning",
    description: "Avg. completion time",
    progressColor: "secondary",
    bg: "default",
    border: "dashed",
  },
]

export const CountriesData: CountriesType[] = [
  {
    name: "India",
    flag: inFlags,
    population: "1.43B",
    value: 14217,
    change: {
      percent: 3.2,
      type: "success"
    }
  },
  {
    name: "Germany",
    flag: deFlags,
    population: "83.2M",
    value: 10412,
    change: {
      percent: 1.5,
      type: "success"
    }
  },
  {
    name: "France",
    flag: frFlags,
    population: "67.5M",
    value: 8934,
    change: {
      percent: 0.8,
      type: "danger"
    }
  },
  {
    name: "United States",
    flag: usFlags,
    population: "339.9M",
    value: 18522,
    change: {
      percent: 2.1,
      type: "success"
    }
  },
  {
    name: "United Kingdom",
    flag: gbFlags,
    population: "67.3M",
    value: 7614,
    change: {
      percent: 1.2,
      type: "danger"
    }
  },
  {
    name: "Canada",
    flag: caFlags,
    population: "39.6M",
    value: 6221,
    change: {
      percent: 0.9,
      type: "success"
    }
  },
  {
    name: "Japan",
    flag: jpFlags,
    population: "123.3M",
    value: 5785,
    change: {
      percent: 0.0,
      type: "warning"
    }
  },
  {
    name: "Australia",
    flag: auFlags,
    population: "26.8M",
    value: 4918,
    change: {
      percent: 1.1,
      type: "success"
    }
  }
]
