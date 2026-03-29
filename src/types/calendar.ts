import type { EventInput } from '@fullcalendar/core'

export type CalendarFormType = {
  isEditable: boolean
  eventData?: EventInput
  onUpdateEvent: (data: any) => void
  onRemoveEvent: () => void
  onAddEvent: (data: any) => void
  open: boolean
  toggle: () => void
}

export type SubmitEventType = {
  title: string
  category: string
}
