import type {ReactNode} from 'react'
import type {IconType} from 'react-icons'

export type FeedCardType = {
  avatar: string
  name: string
  time: string
  description?: string
  children?: ReactNode
}

export type CommentType = {
  avatar: string
  name: string
  message: string
  time: string
  reply?: CommentType[]
}

export type ActivityType = {
  avatar: string
  name: string
  message: string
  time: string
  image?: string
}

export type TrendingType = {
  title: string
  description: string
  url: string
}

export type RequestType = {
  avatar?: string
  icon?: IconType
  iconBg?: string
  title: string
  description: string
  badge: { text: string; className: string }
  time: string
  action: string
}