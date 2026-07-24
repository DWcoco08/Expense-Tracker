import { categories, transactions, wallets } from '@expense/db/schema'
import { and, eq, isNull, sql } from 'drizzle-orm'
import type { Database } from '../../types'

const totalsColumns = {
  id: wallets.id,
  name: wallets.name,
  initialBalance: wallets.initialBalance,
  currency: wallets.currency,
  note: wallets.note,
  archivedAt: wallets.archivedAt,
  createdAt: wallets.createdAt,
  updatedAt: wallets.updatedAt,
  totalIncome: sql<number>`coalesce(sum(case when ${categories.type} = 'income' then ${transactions.amount} else 0 end), 0)`,
  totalExpense: sql<number>`coalesce(sum(case when ${categories.type} = 'expense' then ${transactions.amount} else 0 end), 0)`,
}

export async function listWithTotals(db: Database, userId: string, includeArchived: boolean) {
  const condition = includeArchived
    ? eq(wallets.userId, userId)
    : and(eq(wallets.userId, userId), isNull(wallets.archivedAt))

  return db
    .select(totalsColumns)
    .from(wallets)
    .leftJoin(transactions, eq(transactions.walletId, wallets.id))
    .leftJoin(categories, eq(categories.id, transactions.categoryId))
    .where(condition)
    .groupBy(wallets.id)
    .orderBy(wallets.createdAt)
}

export async function findWithTotalsById(db: Database, userId: string, id: string) {
  const rows = await db
    .select(totalsColumns)
    .from(wallets)
    .leftJoin(transactions, eq(transactions.walletId, wallets.id))
    .leftJoin(categories, eq(categories.id, transactions.categoryId))
    .where(and(eq(wallets.userId, userId), eq(wallets.id, id)))
    .groupBy(wallets.id)
    .limit(1)
  return rows[0] ?? null
}

export async function findById(db: Database, userId: string, id: string) {
  const rows = await db
    .select()
    .from(wallets)
    .where(and(eq(wallets.userId, userId), eq(wallets.id, id)))
    .limit(1)
  return rows[0] ?? null
}

// BR-10 — trùng tên chỉ tính giữa các ví đang hoạt động (chưa lưu trữ)
export async function findActiveByName(db: Database, userId: string, name: string) {
  const rows = await db
    .select()
    .from(wallets)
    .where(and(eq(wallets.userId, userId), eq(wallets.name, name), isNull(wallets.archivedAt)))
    .limit(1)
  return rows[0] ?? null
}

export async function insert(
  db: Database,
  data: {
    id: string
    userId: string
    name: string
    initialBalance: number
    currency: string
    note: string | null
    createdAt: number
  },
) {
  const rows = await db
    .insert(wallets)
    .values({ ...data, updatedAt: data.createdAt })
    .returning()
  const wallet = rows[0]
  if (!wallet) throw new Error('insert_wallet_failed')
  return wallet
}

export async function update(
  db: Database,
  userId: string,
  id: string,
  data: { name?: string; initialBalance?: number; note?: string | null },
  updatedAt: number,
) {
  await db
    .update(wallets)
    .set({ ...data, updatedAt })
    .where(and(eq(wallets.userId, userId), eq(wallets.id, id)))
}

export async function setArchived(
  db: Database,
  userId: string,
  id: string,
  archivedAt: number | null,
) {
  await db
    .update(wallets)
    .set({ archivedAt, updatedAt: Date.now() })
    .where(and(eq(wallets.userId, userId), eq(wallets.id, id)))
}

export async function remove(db: Database, userId: string, id: string) {
  await db.delete(wallets).where(and(eq(wallets.userId, userId), eq(wallets.id, id)))
}

export async function countTransactions(db: Database, walletId: string) {
  const rows = await db
    .select({ count: sql<number>`count(*)` })
    .from(transactions)
    .where(eq(transactions.walletId, walletId))
  return rows[0]?.count ?? 0
}
