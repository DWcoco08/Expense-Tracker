import { ACCESS_TOKEN_TTL_MS, REFRESH_TOKEN_TTL_MS } from '@expense/shared'
import type { Context } from 'hono'
import { deleteCookie, setCookie } from 'hono/cookie'

const REFRESH_PATH = '/v1/auth'

export function setSessionCookies(c: Context, accessToken: string, refreshToken: string): void {
  setCookie(c, 'at', accessToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    path: '/',
    maxAge: Math.floor(ACCESS_TOKEN_TTL_MS / 1000),
  })
  setCookie(c, 'rt', refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    path: REFRESH_PATH,
    maxAge: Math.floor(REFRESH_TOKEN_TTL_MS / 1000),
  })
}

export function clearSessionCookies(c: Context): void {
  deleteCookie(c, 'at', { path: '/' })
  deleteCookie(c, 'rt', { path: REFRESH_PATH })
}
