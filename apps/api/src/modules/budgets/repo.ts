import { budgets, categories, transactions } from '@expense/db/schema'
import { and, eq, gte, lt, sql } from 'drizzle-orm'
import { monthRange } from '../../lib/month'
import type { Database } from '../../types'

export async function findById(db: Database, userId: string, id: string) {
  const rows = await db
    .select()
    .from(budgets)
    .where(and(eq(budgets.userId, userId), eq(budgets.id, id)))
    .limit(1)
  return rows[0] ?? null
}

export async function findByCategoryMonth(
  db: Database,
  userId: string,
  categoryId: string,
  month: string,
) {
  const rows = await db
    .select()
    .from(budgets)
    .where(
      and(eq(budgets.userId, userId), eq(budgets.categoryId, categoryId), eq(budgets.month, month)),
    )
    .limit(1)
  return rows[0] ?? null
}

// Danh sách ngân sách một tháng kèm tên/màu danh mục — không tính "đã chi" ở đây,
// xem spentByCategoryInMonth (tách riêng để tránh nhân bản amount_limit khi join
// trực tiếp với transactions, cùng cách stats module đã tránh lỗi fan-out).
export async function listByMonth(db: Database, userId: string, month: string) {
  return db
    .select({
      id: budgets.id,
      categoryId: budgets.categoryId,
      categoryName: categories.name,
      categoryColor: categories.color,
      month: budgets.month,
      amountLimit: budgets.amountLimit,
      createdAt: budgets.createdAt,
      updatedAt: budgets.updatedAt,
    })
    .from(budgets)
    .innerJoin(categories, eq(categories.id, budgets.categoryId))
    .where(and(eq(budgets.userId, userId), eq(budgets.month, month)))
}

export async function spentByCategoryInMonth(db: Database, userId: string, month: string) {
  const { from, toExclusive } = monthRange(month)
  const rows = await db
    .select({
      categoryId: transactions.categoryId,
      spent: sql<number>`coalesce(sum(${transactions.amount}), 0)`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        gte(transactions.occurredOn, from),
        lt(transactions.occurredOn, toExclusive),
      ),
    )
    .groupBy(transactions.categoryId)
  return new Map(rows.map((row) => [row.categoryId, row.spent]))
}

export async function insert(
  db: Database,
  data: {
    id: string
    userId: string
    categoryId: string
    month: string
    amountLimit: number
    createdAt: number
  },
) {
  const rows = await db
    .insert(budgets)
    .values({ ...data, updatedAt: data.createdAt })
    .returning()
  const budget = rows[0]
  if (!budget) throw new Error('insert_budget_failed')
  return budget
}

export async function update(
  db: Database,
  userId: string,
  id: string,
  amountLimit: number,
  updatedAt: number,
) {
  await db
    .update(budgets)
    .set({ amountLimit, updatedAt })
    .where(and(eq(budgets.userId, userId), eq(budgets.id, id)))
}

export async function remove(db: Database, userId: string, id: string) {
  await db.delete(budgets).where(and(eq(budgets.userId, userId), eq(budgets.id, id)))
}
