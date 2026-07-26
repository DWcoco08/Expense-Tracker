import { api } from '@/lib/api'

export type NotificationType = 'budget_exceeded' | 'recurring_materialized'

export interface Notification {
  id: string
  type: NotificationType
  message: string
  readAt: number | null
  createdAt: number
}

export interface ListNotificationsResult {
  items: Notification[]
  nextCursor: string | null
  unreadCount: number
}

export function listNotifications() {
  return api.get<ListNotificationsResult>('/notifications')
}

export function markNotificationRead(id: string) {
  return api.post<undefined>(`/notifications/${id}/read`)
}

export function markAllNotificationsRead() {
  return api.post<undefined>('/notifications/read-all')
}
