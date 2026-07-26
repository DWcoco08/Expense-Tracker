import type { NotificationType } from '@expense/shared'
import { AppError, generateId } from '@expense/shared'
import type { Database } from '../../types'
import { decodeCursor, encodeCursor } from './cursor'
import type { ListNotificationsQuery } from './model'
import * as repo from './repo'

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100

function clampLimit(limit: number | undefined): number {
  if (!limit) return DEFAULT_LIMIT
  return Math.min(limit, MAX_LIMIT)
}

// Chỉ dùng nội bộ bởi budgets/service.ts và recurring/service.ts — không có route
// POST công khai (architecture.md mục 3: cross-module gọi thẳng hàm service).
export async function create(
  db: Database,
  userId: string,
  type: NotificationType,
  message: string,
) {
  await repo.insert(db, { id: generateId(), userId, type, message, createdAt: Date.now() })
}

export async function listNotifications(
  db: Database,
  userId: string,
  query: ListNotificationsQuery,
) {
  const limit = clampLimit(query.limit)
  const cursor = query.cursor ? decodeCursor(query.cursor) : null

  const [rows, unreadCount] = await Promise.all([
    repo.list(db, userId, { cursor: cursor ?? undefined, limit }),
    repo.countUnread(db, userId),
  ])

  const hasMore = rows.length > limit
  const page = hasMore ? rows.slice(0, limit) : rows
  const last = page[page.length - 1]
  const nextCursor =
    hasMore && last ? encodeCursor({ createdAt: last.createdAt, id: last.id }) : null

  return { items: page, nextCursor, unreadCount }
}

export async function markRead(db: Database, userId: string, id: string) {
  const notification = await repo.findById(db, userId, id)
  if (!notification) throw new AppError('NOT_FOUND', 'notification_not_found')
  await repo.markRead(db, userId, id, Date.now())
}

export async function markAllRead(db: Database, userId: string) {
  await repo.markAllRead(db, userId, Date.now())
}
