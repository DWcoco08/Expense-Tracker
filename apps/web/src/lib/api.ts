import type { ErrorCode } from '@expense/shared'

export class ApiError extends Error {
  code: ErrorCode
  details?: unknown

  constructor(code: ErrorCode, message: string, details?: unknown) {
    super(message)
    this.code = code
    this.details = details
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
  query?: Record<string, string | number | boolean | undefined>
}

interface ErrorResponseBody {
  error?: { code?: string; message?: string; details?: unknown }
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = new URL(`/v1${path}`, window.location.origin)
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) url.searchParams.set(key, String(value))
    }
  }
  return `${url.pathname}${url.search}`
}

// Wrapper fetch duy nhất của toàn bộ frontend (standards.md mục 4). credentials:
// 'include' để cookie phiên (httpOnly) được gửi kèm — cùng origin nên không cần CORS.
async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(buildUrl(path, options.query), {
    method: options.method ?? 'GET',
    credentials: 'include',
    headers: options.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  })

  if (response.status === 204) return undefined as T

  const data: ErrorResponseBody | T | null = await response.json().catch(() => null)

  if (!response.ok) {
    const body = (data ?? {}) as ErrorResponseBody
    const code = (body.error?.code as ErrorCode | undefined) ?? 'INTERNAL'
    const message = body.error?.message ?? 'unknown_error'
    throw new ApiError(code, message, body.error?.details)
  }

  return data as T
}

export const api = {
  get: <T>(path: string, query?: RequestOptions['query']) => request<T>(path, { query }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}

const ERROR_MESSAGES: Record<ErrorCode, string> = {
  VALIDATION: 'Dữ liệu nhập chưa hợp lệ.',
  UNAUTHENTICATED: 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.',
  INVALID_CREDENTIALS: 'Email hoặc mật khẩu không đúng.',
  FORBIDDEN: 'Bạn không có quyền thực hiện thao tác này.',
  NOT_FOUND: 'Không tìm thấy dữ liệu.',
  EMAIL_TAKEN: 'Email này đã được đăng ký.',
  DUPLICATE_NAME: 'Tên này đã được sử dụng.',
  WALLET_HAS_TRANSACTIONS: 'Ví đang có giao dịch, hãy lưu trữ thay vì xoá.',
  CATEGORY_HAS_TRANSACTIONS: 'Danh mục đang có giao dịch, hãy lưu trữ thay vì xoá.',
  CATEGORY_TYPE_IMMUTABLE: 'Không thể đổi loại thu/chi của danh mục đã tạo.',
  FUTURE_DATE: 'Ngày giao dịch không được ở tương lai.',
  WALLET_ARCHIVED: 'Ví này đã được lưu trữ.',
  CATEGORY_ARCHIVED: 'Danh mục này đã được lưu trữ.',
  BUDGET_EXISTS: 'Danh mục này đã có ngân sách trong tháng đã chọn.',
  BUDGET_CATEGORY_TYPE_INVALID: 'Ngân sách chỉ áp dụng cho danh mục chi.',
  RECURRING_END_BEFORE_START: 'Ngày kết thúc phải sau ngày bắt đầu.',
  RATE_LIMITED: 'Bạn thao tác quá nhiều lần, vui lòng thử lại sau.',
  INTERNAL: 'Đã có lỗi xảy ra, vui lòng thử lại.',
}

// Hàm parseApiError() duy nhất — không viết try/catch rải rác từng nơi (standards.md mục 4)
export function parseApiError(error: unknown): string {
  if (error instanceof ApiError) {
    return ERROR_MESSAGES[error.code] ?? ERROR_MESSAGES.INTERNAL
  }
  return ERROR_MESSAGES.INTERNAL
}
