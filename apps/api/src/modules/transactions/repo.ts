import { categories, transactions, wallets } from '@expense/db/schema'
import type { CategoryType } from '@expense/shared'
import { and, desc, eq, gte, lt, lte, or, sql } from 'drizzle-orm'
import type { Cursor } from '../../lib/cursor'
import type { Database } from '../../types'

export interface ListFilters {
  from?: string
  to?: string
  walletId?: string
  categoryId?: string
  type?: CategoryType
  minAmount?: number
  maxAmount?: number
  q?: string
  cursor?: Cursor
  limit: number
}

const detailColumns = {
  id: transactions.id,
  amount: transactions.amount,
  note: transactions.note,
  occurredOn: transactions.occurredOn,
  walletId: wallets.id,
  walletName: wallets.name,
  categoryId: categories.id,
  categoryName: categories.name,
  categoryType: categories.type,
  categoryIcon: categories.icon,
  categoryColor: categories.color,
}

// wallet_id/category_id là NOT NULL + RESTRICT nên luôn tồn tại bản ghi khớp — dùng inner join an toàn.
function baseQuery(db: Database) {
  return db
    .select(detailColumns)
    .from(transactions)
    .innerJoin(wallets, eq(wallets.id, transactions.walletId))
    .innerJoin(categories, eq(categories.id, transactions.categoryId))
}

export async function findDetailById(db: Database, userId: string, id: string) {
  const rows = await baseQuery(db)
    .where(and(eq(transactions.userId, userId), eq(transactions.id, id)))
    .limit(1)
  return rows[0] ?? null
}

export async function findById(db: Database, userId: string, id: string) {
  const rows = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.userId, userId), eq(transactions.id, id)))
    .limit(1)
  return rows[0] ?? null
}

// Tìm trong ghi chú chỉ chuẩn hoá hoa/thường ASCII — SQLite mặc định không có
// bảng chữ hoa/thường Unicode đầy đủ (không hạ chữ đúng dấu tiếng Việt viết hoa).
export async function list(db: Database, userId: string, filters: ListFilters) {
  const conditions = [eq(transactions.userId, userId)]

  if (filters.from) conditions.push(gte(transactions.occurredOn, filters.from))
  if (filters.to) conditions.push(lte(transactions.occurredOn, filters.to))
  if (filters.walletId) conditions.push(eq(transactions.walletId, filters.walletId))
  if (filters.categoryId) conditions.push(eq(transactions.categoryId, filters.categoryId))
  if (filters.type) conditions.push(eq(categories.type, filters.type))
  if (filters.minAmount !== undefined) conditions.push(gte(transactions.amount, filters.minAmount))
  if (filters.maxAmount !== undefined) conditions.push(lte(transactions.amount, filters.maxAmount))
  if (filters.q) {
    conditions.push(sql`lower(${transactions.note}) like lower(${`%${filters.q}%`})`)
  }
  if (filters.cursor) {
    const cursor = filters.cursor
    const c = or(
      lt(transactions.occurredOn, cursor.occurredOn),
      and(eq(transactions.occurredOn, cursor.occurredOn), lt(transactions.id, cursor.id)),
    )
    if (c) conditions.push(c)
  }

  return baseQuery(db)
    .where(and(...conditions))
    .orderBy(desc(transactions.occurredOn), desc(transactions.id))
    .limit(filters.limit + 1)
}

export async function insert(
  db: Database,
  data: {
    id: string
    userId: string
    walletId: string
    categoryId: string
    amount: number
    note: string | null
    occurredOn: string
    createdAt: number
  },
) {
  await db.insert(transactions).values({ ...data, updatedAt: data.createdAt })
}

export async function update(
  db: Database,
  userId: string,
  id: string,
  data: {
    amount?: number
    walletId?: string
    categoryId?: string
    occurredOn?: string
    note?: string | null
  },
  updatedAt: number,
) {
  await db
    .update(transactions)
    .set({ ...data, updatedAt })
    .where(and(eq(transactions.userId, userId), eq(transactions.id, id)))
}

export async function remove(db: Database, userId: string, id: string) {
  await db.delete(transactions).where(and(eq(transactions.userId, userId), eq(transactions.id, id)))
}
