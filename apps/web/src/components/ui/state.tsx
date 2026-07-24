import type { ReactNode } from 'react'
import { parseApiError } from '@/lib/api'

// Ba trạng thái bắt buộc trên mọi màn hình danh sách (standards.md mục 9)
export function LoadingState() {
  return (
    <div className="py-12 text-center text-sm text-neutral-500 dark:text-neutral-400">
      Đang tải…
    </div>
  )
}

export function ErrorState({ error }: { error: unknown }) {
  return (
    <div className="py-12 text-center text-sm text-red-600 dark:text-red-400" role="alert">
      {parseApiError(error)}
    </div>
  )
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-neutral-300 py-12 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
      {children}
    </div>
  )
}
