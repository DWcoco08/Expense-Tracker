import { AppError } from '@expense/shared'
import { Hono } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import { clearSessionCookies, setSessionCookies } from '../../lib/cookies'
import { generateRefreshToken } from '../../lib/tokens'
import { zValidator } from '../../lib/validate'
import { requireAuth } from '../../middleware/auth'
import type { AppEnv } from '../../types'
import { googleCallbackQuerySchema, loginSchema, registerSchema } from './model'
import * as service from './service'

const GOOGLE_OAUTH_PATH = '/v1/auth/google'
const OAUTH_STATE_COOKIE = 'oauth_state'
const OAUTH_STATE_TTL_SECONDS = 300

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

auth.get('/google/start', (c) => {
  const state = generateRefreshToken()
  setCookie(c, OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    path: GOOGLE_OAUTH_PATH,
    maxAge: OAUTH_STATE_TTL_SECONDS,
  })
  const url = service.buildGoogleAuthUrl(c.env.GOOGLE_CLIENT_ID, c.env.GOOGLE_REDIRECT_URI, state)
  return c.redirect(url)
})

auth.get('/google/callback', zValidator('query', googleCallbackQuerySchema), async (c) => {
  const { code, state } = c.req.valid('query')
  const storedState = getCookie(c, OAUTH_STATE_COOKIE)
  deleteCookie(c, OAUTH_STATE_COOKIE, { path: GOOGLE_OAUTH_PATH })

  if (!storedState || state !== storedState) {
    throw new AppError('VALIDATION', 'invalid_oauth_state')
  }

  const { accessToken, refreshToken } = await service.loginWithGoogle(c.get('db'), code, {
    clientId: c.env.GOOGLE_CLIENT_ID,
    clientSecret: c.env.GOOGLE_CLIENT_SECRET,
    redirectUri: c.env.GOOGLE_REDIRECT_URI,
    pepper: c.env.PASSWORD_PEPPER,
    jwtSecret: c.env.JWT_SECRET,
  })
  setSessionCookies(c, accessToken, refreshToken)
  return c.redirect('/')
})
