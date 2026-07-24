import { categories, transactions } from '@expense/db/schema'
import type { CategoryType } from '@expense/shared'
import { and, eq, isNull, sql } from 'drizzle-orm'
import type { Database } from '../../types'

export async function list(db: Database, userId: string, type?: CategoryType) {
  const conditions = type
    ? and(eq(categories.userId, userId), isNull(categories.archivedAt), eq(categories.type, type))
    : and(eq(categories.userId, userId), isNull(categories.archivedAt))

  return db.select().from(categories).where(conditions).orderBy(categories.createdAt)
}

export async function findById(db: Database, userId: string, id: string) {
  const rows = await db
    .select()
    .from(categories)
    .where(and(eq(categories.userId, userId), eq(categories.id, id)))
    .limit(1)
  return rows[0] ?? null
}

// BR-11 — trùng tên chỉ tính giữa danh mục cùng loại và đang hoạt động
export async function findActiveByTypeAndName(
  db: Database,
  userId: string,
  type: CategoryType,
  name: string,
) {
  const rows = await db
    .select()
    .from(categories)
    .where(
      and(
        eq(categories.userId, userId),
        eq(categories.type, type),
        eq(categories.name, name),
        isNull(categories.archivedAt),
      ),
    )
    .limit(1)
  return rows[0] ?? null
}

export async function insert(
  db: Database,
  data: {
    id: string
    userId: string
    name: string
    type: CategoryType
    icon: string | null
    color: string | null
    createdAt: number
  },
) {
  const rows = await db
    .insert(categories)
    .values({ ...data, updatedAt: data.createdAt })
    .returning()
  const category = rows[0]
  if (!category) throw new Error('insert_category_failed')
  return category
}

export async function insertMany(
  db: Database,
  rows: Array<{
    id: string
    userId: string
    name: string
    type: CategoryType
    icon: string | null
    color: string | null
    createdAt: number
  }>,
) {
  if (rows.length === 0) return
  await db.insert(categories).values(rows.map((row) => ({ ...row, updatedAt: row.createdAt })))
}

export async function update(
  db: Database,
  userId: string,
  id: string,
  data: { name?: string; icon?: string | null; color?: string | null },
  updatedAt: number,
) {
  await db
    .update(categories)
    .set({ ...data, updatedAt })
    .where(and(eq(categories.userId, userId), eq(categories.id, id)))
}

export async function setArchived(
  db: Database,
  userId: string,
  id: string,
  archivedAt: number | null,
) {
  await db
    .update(categories)
    .set({ archivedAt, updatedAt: Date.now() })
    .where(and(eq(categories.userId, userId), eq(categories.id, id)))
}

export async function remove(db: Database, userId: string, id: string) {
  await db.delete(categories).where(and(eq(categories.userId, userId), eq(categories.id, id)))
}

export async function countTransactions(db: Database, categoryId: string) {
  const rows = await db
    .select({ count: sql<number>`count(*)` })
    .from(transactions)
    .where(eq(transactions.categoryId, categoryId))
  return rows[0]?.count ?? 0
}
