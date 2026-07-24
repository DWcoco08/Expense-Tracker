import { AppError } from '@expense/shared'
import type { ErrorHandler, NotFoundHandler } from 'hono'
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

  console.error({ event: 'request.unhandled_error', message: err.message })
  return c.json(envelope('INTERNAL', 'internal_error'), 500)
}

export const notFound: NotFoundHandler<AppEnv> = (c) => {
  return c.json(envelope('NOT_FOUND', 'route_not_found'), 404)
}
