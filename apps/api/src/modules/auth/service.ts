import type { users } from '@expense/db/schema'
import {
  AppError,
  DEFAULT_CURRENCY,
  DEFAULT_TIMEZONE,
  LOGIN_ATTEMPT_LIMIT,
  LOGIN_ATTEMPT_WINDOW_MS,
  REFRESH_TOKEN_TTL_MS,
} from '@expense/shared'
import { generateId } from '../../lib/id'
import { signAccessToken } from '../../lib/jwt'
import { hashPassword, verifyPassword } from '../../lib/password'
import { generateRefreshToken, hashRefreshToken } from '../../lib/tokens'
import type { Database } from '../../types'
import type { LoginInput, RegisterInput } from './model'
import * as repo from './repo'

type UserRecord = typeof users.$inferSelect

function toPublicUser(user: UserRecord) {
  const { passwordHash: _passwordHash, ...publicUser } = user
  return publicUser
}

async function createSession(db: Database, userId: string, now: number) {
  const refreshToken = generateRefreshToken()
  const tokenHash = await hashRefreshToken(refreshToken)
  await repo.insertSession(db, {
    id: generateId(),
    userId,
    tokenHash,
    expiresAt: now + REFRESH_TOKEN_TTL_MS,
    createdAt: now,
  })
  return { refreshToken }
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

  const { refreshToken } = await createSession(db, user.id, now)
  const accessToken = await signAccessToken(user.id, jwtSecret)

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

  const { refreshToken } = await createSession(db, user.id, now)
  const accessToken = await signAccessToken(user.id, jwtSecret)

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
  const accessToken = await signAccessToken(session.userId, jwtSecret)

  return { accessToken, refreshToken: next.refreshToken }
}

export async function logout(db: Database, refreshToken: string) {
  const tokenHash = await hashRefreshToken(refreshToken)
  const session = await repo.findActiveSessionByTokenHash(db, tokenHash)
  if (session) await repo.revokeSession(db, session.id)
}

// Dùng bởi module users khi đổi mật khẩu — xác định phiên đang thao tác để giữ lại
export async function findSessionIdByRefreshToken(
  db: Database,
  refreshToken: string,
): Promise<string | null> {
  const tokenHash = await hashRefreshToken(refreshToken)
  const session = await repo.findActiveSessionByTokenHash(db, tokenHash)
  return session?.id ?? null
}

export async function revokeOtherSessions(db: Database, userId: string, keepSessionId: string) {
  await repo.revokeOtherSessions(db, userId, keepSessionId)
}
