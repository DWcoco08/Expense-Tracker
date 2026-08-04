import type { ReactNode } from 'react'
import { parseApiError } from '@/lib/api'

// Ba trạng thái bắt buộc trên mọi màn hình danh sách (standards.md mục 9)
export function LoadingState() {
  return <div className="py-12 text-center text-sm text-muted-foreground">Đang tải…</div>
}

export function ErrorState({ error }: { error: unknown }) {
  return (
    <div className="py-12 text-center text-sm text-status-danger-text" role="alert">
      {parseApiError(error)}
    </div>
  )
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-input bg-card py-12 text-center text-sm text-muted-foreground">
      {children}
    </div>
  )
}
