import { AppError } from '@expense/shared'
import { Hono } from 'hono'
import { getCookie } from 'hono/cookie'
import { clearSessionCookies, setSessionCookies } from '../../lib/cookies'
import { zValidator } from '../../lib/validate'
import { requireAuth } from '../../middleware/auth'
import type { AppEnv } from '../../types'
import { loginSchema, registerSchema } from './model'
import * as service from './service'

export const auth = new Hono<AppEnv>()

auth.post('/register', zValidator('json', registerSchema), async (c) => {
  const { user, accessToken, refreshToken } = await service.register(
    c.get('db'),
    c.req.valid('json'),
    c.env.PASSWORD_PEPPER,
    c.env.JWT_SECRET,
  )
  setSessionCookies(c, accessToken, refreshToken)
  c.header('Cache-Control', 'no-store')
  return c.json({ user }, 201)
})

auth.post('/login', zValidator('json', loginSchema), async (c) => {
  const ip = c.req.header('cf-connecting-ip') ?? 'unknown'
  const { user, accessToken, refreshToken } = await service.login(
    c.get('db'),
    c.req.valid('json'),
    ip,
    c.env.PASSWORD_PEPPER,
    c.env.JWT_SECRET,
  )
  setSessionCookies(c, accessToken, refreshToken)
  c.header('Cache-Control', 'no-store')
  return c.json({ user })
})

auth.post('/refresh', async (c) => {
  const token = getCookie(c, 'rt')
  if (!token) throw new AppError('UNAUTHENTICATED', 'missing_refresh_token')

  const { accessToken, refreshToken } = await service.refresh(c.get('db'), token, c.env.JWT_SECRET)
  setSessionCookies(c, accessToken, refreshToken)
  c.header('Cache-Control', 'no-store')
  return c.json({})
})

auth.post('/logout', requireAuth, async (c) => {
  const token = getCookie(c, 'rt')
  if (token) await service.logout(c.get('db'), token)
  clearSessionCookies(c)
  c.header('Cache-Control', 'no-store')
  return c.body(null, 204)
})
