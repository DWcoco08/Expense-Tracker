import { AppError } from '@expense/shared'
import type { ErrorHandler, NotFoundHandler } from 'hono'
import { HTTPException } from 'hono/http-exception'
import type { AppEnv } from '../types'

interface ErrorEnvelope {
  error: {
    code: string
    message: string
    details?: unknown
  }
}

function envelope(code: string, message: string, details?: unknown): ErrorEnvelope {
  return details === undefined
    ? { error: { code, message } }
    : { error: { code, message, details } }
}

export const onError: ErrorHandler<AppEnv> = (err, c) => {
  if (err instanceof AppError) {
    return c.json(envelope(err.code, err.message, err.details), err.status)
  }

  // Hono tự ném HTTPException(400,...) khi body không parse được (JSON hỏng,
  // form-data hỏng...) trước cả khi tới zValidator — đây là lỗi đầu vào của
  // client, không phải lỗi hệ thống, nên không được rơi vào nhánh INTERNAL 500.
  if (err instanceof HTTPException) {
    return c.json(envelope('VALIDATION', 'invalid_request_body'), 400)
  }

  console.error({ event: 'request.unhandled_error', message: err.message })
  return c.json(envelope('INTERNAL', 'internal_error'), 500)
}

export const notFound: NotFoundHandler<AppEnv> = (c) => {
  return c.json(envelope('NOT_FOUND', 'route_not_found'), 404)
}
