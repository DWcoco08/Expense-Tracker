import type { ReactNode } from 'react'

type Tone = 'neutral' | 'success' | 'danger' | 'warning'

const TONE_CLASSES: Record<Tone, string> = {
  neutral: 'bg-muted text-muted-foreground',
  success: 'bg-status-success-surface text-status-success-text',
  danger: 'bg-status-danger-surface text-status-danger-text',
  warning: 'bg-status-warning-surface text-status-warning-text',
}

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  )
}
