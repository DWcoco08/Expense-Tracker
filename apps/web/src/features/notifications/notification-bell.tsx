import { useState } from 'react'
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/state'
import type { Notification } from './api'
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from './use-notifications'

function formatTime(createdAt: number): string {
  return new Date(createdAt).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const { data, isLoading, isError, error } = useNotifications()
  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()

  const unreadCount = data?.unreadCount ?? 0

  function handleItemClick(notification: Notification) {
    if (!notification.readAt) markRead.mutate(notification.id)
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Thông báo"
        className="relative shrink-0 rounded-md border border-neutral-300 px-3 py-1.5 text-neutral-700 dark:border-neutral-700 dark:text-neutral-300"
      >
        Thông báo
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-medium text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Đóng"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div className="absolute right-0 z-50 mt-2 w-80 max-w-[90vw] rounded-lg border border-neutral-200 bg-white p-3 shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                Thông báo
              </span>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => markAllRead.mutate()}
                  className="text-xs text-neutral-500 hover:underline dark:text-neutral-400"
                >
                  Đánh dấu tất cả đã đọc
                </button>
              )}
            </div>

            {isLoading && <LoadingState />}
            {isError && <ErrorState error={error} />}
            {data && data.items.length === 0 && <EmptyState>Không có thông báo nào.</EmptyState>}

            {data && data.items.length > 0 && (
              <ul className="max-h-80 space-y-1 overflow-y-auto">
                {data.items.map((notification) => (
                  <li key={notification.id}>
                    <button
                      type="button"
                      onClick={() => handleItemClick(notification)}
                      className={`w-full rounded-md p-2 text-left text-sm ${
                        notification.readAt
                          ? 'text-neutral-500 dark:text-neutral-400'
                          : 'bg-neutral-50 font-medium text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100'
                      }`}
                    >
                      <p>{notification.message}</p>
                      <p className="mt-0.5 text-xs text-neutral-400 dark:text-neutral-500">
                        {formatTime(notification.createdAt)}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  )
}
