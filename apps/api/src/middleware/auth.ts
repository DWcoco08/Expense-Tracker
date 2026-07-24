import { AppError } from '@expense/shared'
import type { MiddlewareHandler } from 'hono'
import { getCookie } from 'hono/cookie'
import { verifyAccessToken } from '../lib/jwt'
import type { AppEnv } from '../types'

export const requireAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  const token = getCookie(c, 'at')
  if (!token) throw new AppError('UNAUTHENTICATED', 'missing_access_token')

  try {
    const userId = await verifyAccessToken(token, c.env.JWT_SECRET)
    c.set('userId', userId)
  } catch {
    throw new AppError('UNAUTHENTICATED', 'invalid_access_token')
  }

  await next()
}
