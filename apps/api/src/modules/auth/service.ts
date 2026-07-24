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
