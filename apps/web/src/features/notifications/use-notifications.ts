import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as notificationsApi from './api'

const NOTIFICATIONS_KEY = ['notifications']

// Không có kênh đẩy thời gian thực (đã chọn không dùng WebSocket/Durable Object cho
// v2 này) — polling nhẹ mỗi 30s để cập nhật số chưa đọc.
export function useNotifications() {
  return useQuery({
    queryKey: NOTIFICATIONS_KEY,
    queryFn: notificationsApi.listNotifications,
    refetchInterval: 30_000,
  })
}

function useInvalidateNotifications() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY })
}

export function useMarkNotificationRead() {
  const invalidate = useInvalidateNotifications()
  return useMutation({ mutationFn: notificationsApi.markNotificationRead, onSuccess: invalidate })
}

export function useMarkAllNotificationsRead() {
  const invalidate = useInvalidateNotifications()
  return useMutation({
    mutationFn: notificationsApi.markAllNotificationsRead,
    onSuccess: invalidate,
  })
}
