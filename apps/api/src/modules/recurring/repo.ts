import { recurringTransactions } from '@expense/db/schema'
import type { RecurringFrequency } from '@expense/shared'
import { and, eq, isNull, lte, or } from 'drizzle-orm'
import type { Database } from '../../types'

export async function findById(db: Database, userId: string, id: string) {
  const rows = await db
    .select()
    .from(recurringTransactions)
    .where(and(eq(recurringTransactions.userId, userId), eq(recurringTransactions.id, id)))
    .limit(1)
  return rows[0] ?? null
}

export async function listByUser(db: Database, userId: string) {
  return db
    .select()
    .from(recurringTransactions)
    .where(eq(recurringTransactions.userId, userId))
    .orderBy(recurringTransactions.createdAt)
}

// Chỉ chọn định kỳ chưa lưu trữ, tới hạn, và chưa vượt end_on (nếu có) — xem srs.md FR-18
export async function findDue(db: Database, today: string) {
  return db
    .select()
    .from(recurringTransactions)
    .where(
      and(
        isNull(recurringTransactions.archivedAt),
        lte(recurringTransactions.nextRunOn, today),
        or(
          isNull(recurringTransactions.endOn),
          lte(recurringTransactions.nextRunOn, recurringTransactions.endOn),
        ),
      ),
    )
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
    frequency: RecurringFrequency
    anchorDay: number | null
    startOn: string
    endOn: string | null
    nextRunOn: string
    createdAt: number
  },
) {
  const rows = await db
    .insert(recurringTransactions)
    .values({ ...data, updatedAt: data.createdAt })
    .returning()
  const row = rows[0]
  if (!row) throw new Error('insert_recurring_failed')
  return row
}

export async function update(
  db: Database,
  userId: string,
  id: string,
  data: { amount?: number; note?: string | null; endOn?: string | null },
  updatedAt: number,
) {
  await db
    .update(recurringTransactions)
    .set({ ...data, updatedAt })
    .where(and(eq(recurringTransactions.userId, userId), eq(recurringTransactions.id, id)))
}

export async function setArchived(
  db: Database,
  userId: string,
  id: string,
  archivedAt: number | null,
) {
  await db
    .update(recurringTransactions)
    .set({ archivedAt, updatedAt: Date.now() })
    .where(and(eq(recurringTransactions.userId, userId), eq(recurringTransactions.id, id)))
}

export async function advance(db: Database, id: string, nextRunOn: string) {
  await db
    .update(recurringTransactions)
    .set({ nextRunOn, updatedAt: Date.now() })
    .where(eq(recurringTransactions.id, id))
}

export async function remove(db: Database, userId: string, id: string) {
  await db
    .delete(recurringTransactions)
    .where(and(eq(recurringTransactions.userId, userId), eq(recurringTransactions.id, id)))
}
