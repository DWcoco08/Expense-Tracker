import type { users } from '@expense/db/schema'
import {
  AppError,
  DEFAULT_CURRENCY,
  DEFAULT_TIMEZONE,
  generateId,
  LOGIN_ATTEMPT_LIMIT,
  LOGIN_ATTEMPT_WINDOW_MS,
  REFRESH_TOKEN_TTL_MS,
} from '@expense/shared'
import { signAccessToken } from '../../lib/jwt'
import { hashPassword, verifyPassword } from '../../lib/password'
import { generateRefreshToken, hashRefreshToken } from '../../lib/tokens'
import type { Database } from '../../types'
import { createDefaultCategories } from '../categories/service'
import type { LoginInput, RegisterInput } from './model'
import * as repo from './repo'

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo'

interface GoogleTokenResponse {
  access_token: string
}

interface GoogleUserInfo {
  sub: string
  email: string
  name: string
}

export interface GoogleOAuthConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
  pepper: string
  jwtSecret: string
}

type UserRecord = typeof users.$inferSelect

function toPublicUser(user: UserRecord) {
  const { passwordHash: _passwordHash, ...publicUser } = user
  return publicUser
}

async function createSession(db: Database, userId: string, now: number) {
  const sessionId = generateId()
  const refreshToken = generateRefreshToken()
  const tokenHash = await hashRefreshToken(refreshToken)
  await repo.insertSession(db, {
    id: sessionId,
    userId,
    tokenHash,
    expiresAt: now + REFRESH_TOKEN_TTL_MS,
    createdAt: now,
  })
  return { sessionId, refreshToken }
}

export async function register(
  db: Database,
  input: RegisterInput,
  pepper: string,
  jwtSecret: string,
) {
  const existing = await repo.findUserByEmail(db, input.email)
  if (existing) throw new AppError('EMAIL_TAKEN', 'email_already_registered')

  const now = Date.now()
  const passwordHash = await hashPassword(input.password, pepper)
  const user = await repo.insertUser(db, {
    id: generateId(),
    email: input.email,
    passwordHash,
    name: input.name,
    timezone: DEFAULT_TIMEZONE,
    baseCurrency: DEFAULT_CURRENCY,
    createdAt: now,
  })

  await createDefaultCategories(db, user.id, now)

  const { sessionId, refreshToken } = await createSession(db, user.id, now)
  const accessToken = await signAccessToken({ userId: user.id, sessionId }, jwtSecret)

  return { user: toPublicUser(user), accessToken, refreshToken }
}

// Sai email và sai mật khẩu phải ném CÙNG một AppError — tránh lộ email nào đã đăng ký (FR-02)
export async function login(
  db: Database,
  input: LoginInput,
  ip: string,
  pepper: string,
  jwtSecret: string,
) {
  const now = Date.now()
  const since = now - LOGIN_ATTEMPT_WINDOW_MS

  const recentFailures = await repo.countRecentLoginFailures(db, input.email, ip, since)
  if (recentFailures >= LOGIN_ATTEMPT_LIMIT) {
    throw new AppError('RATE_LIMITED', 'too_many_login_attempts')
  }

  const user = await repo.findUserByEmail(db, input.email)
  const valid = user ? await verifyPassword(input.password, pepper, user.passwordHash) : false

  if (!user || !valid) {
    await repo.insertLoginFailure(db, {
      id: generateId(),
      email: input.email,
      ip,
      attemptedAt: now,
    })
    throw new AppError('INVALID_CREDENTIALS', 'invalid_credentials')
  }

  const { sessionId, refreshToken } = await createSession(db, user.id, now)
  const accessToken = await signAccessToken({ userId: user.id, sessionId }, jwtSecret)

  return { user: toPublicUser(user), accessToken, refreshToken }
}

// Xoay vòng token — refresh token cũ bị vô hiệu ngay khi cấp cặp mới (BR-16)
export async function refresh(db: Database, refreshToken: string, jwtSecret: string) {
  const now = Date.now()
  const tokenHash = await hashRefreshToken(refreshToken)
  const session = await repo.findActiveSessionByTokenHash(db, tokenHash)
  if (!session) throw new AppError('UNAUTHENTICATED', 'invalid_refresh_token')

  await repo.revokeSession(db, session.id)
  const next = await createSession(db, session.userId, now)
  const accessToken = await signAccessToken(
    { userId: session.userId, sessionId: next.sessionId },
    jwtSecret,
  )

  return { accessToken, refreshToken: next.refreshToken }
}

export async function logout(db: Database, refreshToken: string) {
  const tokenHash = await hashRefreshToken(refreshToken)
  const session = await repo.findActiveSessionByTokenHash(db, tokenHash)
  if (session) await repo.revokeSession(db, session.id)
}

export async function revokeOtherSessions(db: Database, userId: string, keepSessionId: string) {
  await repo.revokeOtherSessions(db, userId, keepSessionId)
}

// FR-05 — yêu cầu mật khẩu hiện tại, đổi xong thu hồi mọi phiên khác ở service users
export async function changePassword(
  db: Database,
  userId: string,
  currentPassword: string,
  newPassword: string,
  pepper: string,
) {
  const user = await repo.findUserById(db, userId)
  if (!user) throw new AppError('NOT_FOUND', 'user_not_found')

  const valid = await verifyPassword(currentPassword, pepper, user.passwordHash)
  if (!valid) throw new AppError('INVALID_CREDENTIALS', 'invalid_credentials')

  const newHash = await hashPassword(newPassword, pepper)
  await repo.updatePasswordHash(db, userId, newHash, Date.now())
}

export function buildGoogleAuthUrl(clientId: string, redirectUri: string, state: string): string {
  const url = new URL(GOOGLE_AUTH_URL)
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', 'openid email profile')
  url.searchParams.set('state', state)
  return url.toString()
}

async function exchangeGoogleCode(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string,
): Promise<string> {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })
  if (!response.ok) throw new AppError('INTERNAL', 'google_token_exchange_failed')
  const body = (await response.json()) as GoogleTokenResponse
  return body.access_token
}

async function fetchGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const response = await fetch(GOOGLE_USERINFO_URL, {
    headers: { authorization: `Bearer ${accessToken}` },
  })
  if (!response.ok) throw new AppError('INTERNAL', 'google_userinfo_failed')
  return (await response.json()) as GoogleUserInfo
}

// Google đã xác minh quyền sở hữu email nên tự gắn vào tài khoản có sẵn cùng email
// là hợp lý (không cần bước xác nhận thêm). Tài khoản mới được cấp mật khẩu ngẫu
// nhiên không lộ ra ngoài thay vì nới password_hash thành nullable — xem srs.md FR-21.
export async function loginWithGoogle(db: Database, code: string, config: GoogleOAuthConfig) {
  const accessToken = await exchangeGoogleCode(
    code,
    config.clientId,
    config.clientSecret,
    config.redirectUri,
  )
  const info = await fetchGoogleUserInfo(accessToken)
  const now = Date.now()

  const identity = await repo.findOAuthIdentity(db, 'google', info.sub)
  let user = identity ? await repo.findUserById(db, identity.userId) : null

  if (!user) {
    user = await repo.findUserByEmail(db, info.email)

    if (!user) {
      const passwordHash = await hashPassword(generateRefreshToken(), config.pepper)
      user = await repo.insertUser(db, {
        id: generateId(),
        email: info.email,
        passwordHash,
        name: info.name,
        timezone: DEFAULT_TIMEZONE,
        baseCurrency: DEFAULT_CURRENCY,
        createdAt: now,
      })
      await createDefaultCategories(db, user.id, now)
    }

    await repo.insertOAuthIdentity(db, {
      id: generateId(),
      userId: user.id,
      provider: 'google',
      providerUserId: info.sub,
      createdAt: now,
    })
  }

  const { sessionId, refreshToken } = await createSession(db, user.id, now)
  const jwtAccessToken = await signAccessToken({ userId: user.id, sessionId }, config.jwtSecret)

  return { user: toPublicUser(user), accessToken: jwtAccessToken, refreshToken }
}
