export const ERROR_STATUS = {
  VALIDATION: 400,
  UNAUTHENTICATED: 401,
  INVALID_CREDENTIALS: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  EMAIL_TAKEN: 409,
  DUPLICATE_NAME: 409,
  WALLET_HAS_TRANSACTIONS: 409,
  CATEGORY_HAS_TRANSACTIONS: 409,
  CATEGORY_TYPE_IMMUTABLE: 400,
  FUTURE_DATE: 400,
  WALLET_ARCHIVED: 400,
  CATEGORY_ARCHIVED: 400,
  RATE_LIMITED: 429,
  INTERNAL: 500,
} as const

export type ErrorCode = keyof typeof ERROR_STATUS
export type ErrorStatus = (typeof ERROR_STATUS)[ErrorCode]

export class AppError extends Error {
  code: ErrorCode
  details?: unknown

  constructor(code: ErrorCode, message: string, details?: unknown) {
    super(message)
    this.code = code
    this.details = details
  }

  get status(): ErrorStatus {
    return ERROR_STATUS[this.code]
  }
}
