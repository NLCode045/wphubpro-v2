import React from 'react'
import type { ChartConfiguration } from 'chart.js'

export type ChildrenType = Readonly<{ children: React.ReactNode }>

export type FileType = File & {
  path?: string
  preview?: string
  formattedSize?: string
}

export type ChartJSOptionsType = { data: ChartConfiguration['data']; options?: ChartConfiguration['options'] }
export type VariantType = 'primary' | 'danger' | 'warning' | 'success' | 'info' | 'dark' | 'secondary' | 'purple' | 'light'

export * from './platform'
