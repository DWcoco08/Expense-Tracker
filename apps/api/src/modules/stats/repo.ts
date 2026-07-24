import { categories, transactions, wallets } from '@expense/db/schema'
import { and, desc, eq, gte, isNull, lt, sql } from 'drizzle-orm'
import type { Database } from '../../types'

export async function totalInitialBalance(db: Database, userId: string) {
  const rows = await db
    .select({ total: sql<number>`coalesce(sum(${wallets.initialBalance}), 0)` })
    .from(wallets)
    .where(and(eq(wallets.userId, userId), isNull(wallets.archivedAt)))
  return rows[0]?.total ?? 0
}

// Tổng thu/chi mọi thời điểm trên các ví CHƯA lưu trữ — dùng để tính totalBalance.
// Tách riêng khỏi totalInitialBalance để không bị nhân bản giá trị initial_balance
// theo số dòng giao dịch khi join (fan-out).
export async function totalsForActiveWallets(db: Database, userId: string) {
  const rows = await db
    .select({
      income: sql<number>`coalesce(sum(case when ${categories.type} = 'income' then ${transactions.amount} else 0 end), 0)`,
      expense: sql<number>`coalesce(sum(case when ${categories.type} = 'expense' then ${transactions.amount} else 0 end), 0)`,
    })
    .from(transactions)
    .innerJoin(wallets, eq(wallets.id, transactions.walletId))
    .innerJoin(categories, eq(categories.id, transactions.categoryId))
    .where(and(eq(transactions.userId, userId), isNull(wallets.archivedAt)))
  return rows[0] ?? { income: 0, expense: 0 }
}

export async function totalsInRange(
  db: Database,
  userId: string,
  from: string,
  toExclusive: string,
) {
  const rows = await db
    .select({
      income: sql<number>`coalesce(sum(case when ${categories.type} = 'income' then ${transactions.amount} else 0 end), 0)`,
      expense: sql<number>`coalesce(sum(case when ${categories.type} = 'expense' then ${transactions.amount} else 0 end), 0)`,
    })
    .from(transactions)
    .innerJoin(categories, eq(categories.id, transactions.categoryId))
    .where(
      and(
        eq(transactions.userId, userId),
        gte(transactions.occurredOn, from),
        lt(transactions.occurredOn, toExclusive),
      ),
    )
  return rows[0] ?? { income: 0, expense: 0 }
}

export async function expenseByCategoryInRange(
  db: Database,
  userId: string,
  from: string,
  toExclusive: string,
  limit?: number,
) {
  const query = db
    .select({
      categoryId: categories.id,
      name: categories.name,
      color: categories.color,
      amount: sql<number>`coalesce(sum(${transactions.amount}), 0)`,
    })
    .from(transactions)
    .innerJoin(categories, eq(categories.id, transactions.categoryId))
    .where(
      and(
        eq(transactions.userId, userId),
        eq(categories.type, 'expense'),
        gte(transactions.occurredOn, from),
        lt(transactions.occurredOn, toExclusive),
      ),
    )
    .groupBy(categories.id)
    .orderBy(desc(sql`sum(${transactions.amount})`))

  return limit ? query.limit(limit) : query
}

export async function monthlyTotalsInRange(
  db: Database,
  userId: string,
  from: string,
  toExclusive: string,
) {
  return db
    .select({
      month: sql<string>`substr(${transactions.occurredOn}, 1, 7)`,
      income: sql<number>`coalesce(sum(case when ${categories.type} = 'income' then ${transactions.amount} else 0 end), 0)`,
      expense: sql<number>`coalesce(sum(case when ${categories.type} = 'expense' then ${transactions.amount} else 0 end), 0)`,
    })
    .from(transactions)
    .innerJoin(categories, eq(categories.id, transactions.categoryId))
    .where(
      and(
        eq(transactions.userId, userId),
        gte(transactions.occurredOn, from),
        lt(transactions.occurredOn, toExclusive),
      ),
    )
    .groupBy(sql`substr(${transactions.occurredOn}, 1, 7)`)
}

export async function countTransactionsInRange(
  db: Database,
  userId: string,
  from: string,
  toExclusive: string,
) {
  const rows = await db
    .select({ count: sql<number>`count(*)` })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        gte(transactions.occurredOn, from),
        lt(transactions.occurredOn, toExclusive),
      ),
    )
  return rows[0]?.count ?? 0
}
