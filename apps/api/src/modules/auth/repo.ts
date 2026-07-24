import { loginAttempts, sessions, users } from '@expense/db/schema'
import { and, eq, gt, isNull, sql } from 'drizzle-orm'
import type { Database } from '../../types'

export async function findUserByEmail(db: Database, email: string) {
  const rows = await db.select().from(users).where(eq(users.email, email)).limit(1)
  return rows[0] ?? null
}

export async function findUserById(db: Database, id: string) {
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1)
  return rows[0] ?? null
}

export async function insertUser(
  db: Database,
  data: {
    id: string
    email: string
    passwordHash: string
    name: string
    timezone: string
    baseCurrency: string
    createdAt: number
  },
) {
  const rows = await db
    .insert(users)
    .values({ ...data, updatedAt: data.createdAt })
    .returning()
  const user = rows[0]
  if (!user) throw new Error('insert_user_failed')
  return user
}

export async function updatePasswordHash(
  db: Database,
  userId: string,
  passwordHash: string,
  updatedAt: number,
) {
  await db.update(users).set({ passwordHash, updatedAt }).where(eq(users.id, userId))
}

export async function insertSession(
  db: Database,
  data: {
    id: string
    userId: string
    tokenHash: string
    expiresAt: number
    createdAt: number
  },
) {
  await db.insert(sessions).values(data)
}

export async function findActiveSessionByTokenHash(db: Database, tokenHash: string) {
  const rows = await db
    .select()
    .from(sessions)
    .where(
      and(
        eq(sessions.tokenHash, tokenHash),
        isNull(sessions.revokedAt),
        gt(sessions.expiresAt, Date.now()),
      ),
    )
    .limit(1)
  return rows[0] ?? null
}

export async function revokeSession(db: Database, sessionId: string) {
  await db.update(sessions).set({ revokedAt: Date.now() }).where(eq(sessions.id, sessionId))
}

// Dùng khi đổi mật khẩu (FR-05) — thu hồi mọi phiên khác, giữ phiên hiện tại
export async function revokeOtherSessions(db: Database, userId: string, keepSessionId: string) {
  await db
    .update(sessions)
    .set({ revokedAt: Date.now() })
    .where(
      and(
        eq(sessions.userId, userId),
        isNull(sessions.revokedAt),
        sql`${sessions.id} != ${keepSessionId}`,
      ),
    )
}

export async function countRecentLoginFailures(
  db: Database,
  email: string,
  ip: string,
  sinceTs: number,
) {
  const rows = await db
    .select({ count: sql<number>`count(*)` })
    .from(loginAttempts)
    .where(
      and(
        eq(loginAttempts.email, email),
        eq(loginAttempts.ip, ip),
        gt(loginAttempts.attemptedAt, sinceTs),
      ),
    )
  return rows[0]?.count ?? 0
}

export async function insertLoginFailure(
  db: Database,
  data: { id: string; email: string; ip: string; attemptedAt: number },
) {
  await db.insert(loginAttempts).values(data)
}
