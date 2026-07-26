import { notifications } from '@expense/db/schema'
import type { NotificationType } from '@expense/shared'
import { and, desc, eq, isNull, lt, or, sql } from 'drizzle-orm'
import type { Database } from '../../types'
import type { NotificationCursor } from './cursor'

export async function list(
  db: Database,
  userId: string,
  options: { cursor?: NotificationCursor; limit: number },
) {
  const conditions = [eq(notifications.userId, userId)]

  if (options.cursor) {
    const cursor = options.cursor
    const c = or(
      lt(notifications.createdAt, cursor.createdAt),
      and(eq(notifications.createdAt, cursor.createdAt), lt(notifications.id, cursor.id)),
    )
    if (c) conditions.push(c)
  }

  return db
    .select()
    .from(notifications)
    .where(and(...conditions))
    .orderBy(desc(notifications.createdAt), desc(notifications.id))
    .limit(options.limit + 1)
}

export async function countUnread(db: Database, userId: string) {
  const rows = await db
    .select({ count: sql<number>`count(*)` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)))
  return rows[0]?.count ?? 0
}

export async function findById(db: Database, userId: string, id: string) {
  const rows = await db
    .select()
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.id, id)))
    .limit(1)
  return rows[0] ?? null
}

export async function insert(
  db: Database,
  data: { id: string; userId: string; type: NotificationType; message: string; createdAt: number },
) {
  await db.insert(notifications).values(data)
}

export async function markRead(db: Database, userId: string, id: string, readAt: number) {
  await db
    .update(notifications)
    .set({ readAt })
    .where(and(eq(notifications.userId, userId), eq(notifications.id, id)))
}

export async function markAllRead(db: Database, userId: string, readAt: number) {
  await db
    .update(notifications)
    .set({ readAt })
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)))
}
