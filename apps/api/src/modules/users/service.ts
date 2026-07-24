import type { users } from '@expense/db/schema'
import { AppError } from '@expense/shared'
import type { Database } from '../../types'
import * as authService from '../auth/service'
import type { ChangePasswordInput, UpdateProfileInput } from './model'
import * as repo from './repo'

type UserRecord = typeof users.$inferSelect

function toPublicUser(user: UserRecord) {
  const { passwordHash: _passwordHash, ...publicUser } = user
  return publicUser
}

export async function getProfile(db: Database, userId: string) {
  const user = await repo.findById(db, userId)
  if (!user) throw new AppError('NOT_FOUND', 'user_not_found')
  return toPublicUser(user)
}

export async function updateProfile(db: Database, userId: string, input: UpdateProfileInput) {
  await repo.updateProfile(db, userId, input, Date.now())
  return getProfile(db, userId)
}

// keepSessionId đến từ sessionId trong access token của request đang xử lý —
// không dùng cookie rt vì Path=/v1/auth khiến nó không gửi tới /v1/me/password.
export async function changePassword(
  db: Database,
  userId: string,
  keepSessionId: string,
  input: ChangePasswordInput,
  pepper: string,
) {
  await authService.changePassword(db, userId, input.currentPassword, input.newPassword, pepper)
  await authService.revokeOtherSessions(db, userId, keepSessionId)
}
