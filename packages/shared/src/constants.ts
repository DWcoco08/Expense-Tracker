import type { CategoryType } from './types'

export const DEFAULT_PAGE_SIZE = 20
export const MAX_PAGE_SIZE = 100

export const AMOUNT_MIN = 1
export const AMOUNT_MAX = 999_999_999_999

export const PASSWORD_MIN_LENGTH = 8
export const PASSWORD_MAX_LENGTH = 128

export const LOGIN_ATTEMPT_LIMIT = 6
export const LOGIN_ATTEMPT_WINDOW_MS = 15 * 60 * 1000

export const ACCESS_TOKEN_TTL_MS = 15 * 60 * 1000
export const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000

export const DEFAULT_TIMEZONE = 'Asia/Ho_Chi_Minh'
export const DEFAULT_CURRENCY = 'VND'

export const STATS_OVERVIEW_MAX_MONTHS = 24

// Chặn cứng số dòng xuất CSV một lần — khớp quy mô dữ liệu giả định ở NFR-01
export const EXPORT_MAX_ROWS = 10_000

interface DefaultCategory {
  name: string
  type: CategoryType
  icon: string
  color: string
}

// BR-14 — bộ danh mục cấp cho tài khoản mới, xem srs.md mục 4
export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  { name: 'Ăn uống', type: 'expense', icon: 'utensils', color: '#f59e0b' },
  { name: 'Di chuyển', type: 'expense', icon: 'car', color: '#3b82f6' },
  { name: 'Mua sắm', type: 'expense', icon: 'shopping-bag', color: '#ec4899' },
  { name: 'Hoá đơn', type: 'expense', icon: 'receipt', color: '#ef4444' },
  { name: 'Giải trí', type: 'expense', icon: 'gamepad-2', color: '#8b5cf6' },
  { name: 'Sức khoẻ', type: 'expense', icon: 'heart-pulse', color: '#14b8a6' },
  { name: 'Khác', type: 'expense', icon: 'more-horizontal', color: '#6b7280' },
  { name: 'Lương', type: 'income', icon: 'wallet', color: '#22c55e' },
  { name: 'Thưởng', type: 'income', icon: 'gift', color: '#10b981' },
  { name: 'Khác', type: 'income', icon: 'more-horizontal', color: '#6b7280' },
]
