import type {IconType} from "react-icons"

type CountType = {
  value: number
  prefix?: string
  suffix?: string
}

export type Widget1Type = {
  icon: IconType
  color: string
  label: string
  count: CountType
}
export type Widget3Type = {
  title: string
  icon: IconType
  color: string
  value: number
  unit?: string
  prefix?: string
  label: string
  footerValue?: string
  footerUnit?: string
  color2: string
}

export type Widget4Type = {
  title: string
  value: number
  label: string
  labelValue: number
  trendColor: string
  trendValue: number
  info:string;
}
export type Widget5Type = {
  icon: IconType
  color: string
  value: number
  label: string
  progressLabel: string
  progressValue: number
}
export type Widget6Type = {
  name: string
  role: string
  image: string
  color: string
}

export type ReportStatType = {
  title: string
  value: string | number
  icon: IconType
  percentage: number
  percentageText: string
  percentageColor: "success" | "danger" | "info" | "warning" | "secondary"
  description: string
  progressColor: string
  bg?: string
  border?: string
}


export type ChatMessageType = {
  type: "incoming" | "outgoing"
  user: string
  avatar: string
  message: string
  time: string
}


export type CountriesType = {
  name: string
  flag: string
  population: string
  value: number
  change: {
    percent: number,
    type: string
  }
}
