import { AppError, EXPORT_MAX_ROWS, generateId } from '@expense/shared'
import { todayInTimezone } from '../../lib/clock'
import { toCsv } from '../../lib/csv'
import { type Cursor, decodeCursor, encodeCursor } from '../../lib/cursor'
import type { Database } from '../../types'
import * as budgetsService from '../budgets/service'
import * as categoriesService from '../categories/service'
import * as usersService from '../users/service'
import * as walletsService from '../wallets/service'
import type { CreateTransactionInput, ListTransactionsQuery, UpdateTransactionInput } from './model'
import { clampLimit } from './model'
import * as repo from './repo'

type DetailRow = Awaited<ReturnType<typeof repo.findDetailById>>

function toResponse(row: NonNullable<DetailRow>) {
  return {
    id: row.id,
    amount: row.amount,
    type: row.categoryType,
    wallet: { id: row.walletId, name: row.walletName },
    category: {
      id: row.categoryId,
      name: row.categoryName,
      type: row.categoryType,
      icon: row.categoryIcon,
      color: row.categoryColor,
    },
    occurredOn: row.occurredOn,
    note: row.note,
  }
}

async function assertNotFutureDate(db: Database, userId: string, occurredOn: string) {
  const profile = await usersService.getProfile(db, userId)
  const today = todayInTimezone(profile.timezone)
  if (occurredOn > today) throw new AppError('FUTURE_DATE', 'occurred_on_in_future')
}

export async function getTransaction(db: Database, userId: string, id: string) {
  const row = await repo.findDetailById(db, userId, id)
  if (!row) throw new AppError('NOT_FOUND', 'transaction_not_found')
  return toResponse(row)
}

export async function createTransaction(
  db: Database,
  userId: string,
  input: CreateTransactionInput,
) {
  await assertNotFutureDate(db, userId, input.occurredOn)
  await walletsService.assertUsable(db, userId, input.walletId)
  await categoriesService.assertUsable(db, userId, input.categoryId)

  const id = generateId()
  const now = Date.now()
  await repo.insert(db, {
    id,
    userId,
    walletId: input.walletId,
    categoryId: input.categoryId,
    amount: input.amount,
    note: input.note ?? null,
    occurredOn: input.occurredOn,
    createdAt: now,
  })

  // Thông báo ngân sách là hiệu ứng phụ — lỗi ở đây không được chặn việc ghi nhận
  // giao dịch, vốn là thao tác chính người dùng đang chờ (kickoff.md mục 14).
  await budgetsService
    .notifyIfExceeded(db, userId, input.categoryId, input.occurredOn, input.amount)
    .catch((err) => {
      console.error({ event: 'budgets.notify_failed', message: err.message })
    })

  return getTransaction(db, userId, id)
}

export async function updateTransaction(
  db: Database,
  userId: string,
  id: string,
  input: UpdateTransactionInput,
) {
  const existing = await repo.findById(db, userId, id)
  if (!existing) throw new AppError('NOT_FOUND', 'transaction_not_found')

  if (input.occurredOn) await assertNotFutureDate(db, userId, input.occurredOn)
  if (input.walletId) await walletsService.assertUsable(db, userId, input.walletId)
  if (input.categoryId) await categoriesService.assertUsable(db, userId, input.categoryId)

  await repo.update(
    db,
    userId,
    id,
    {
      amount: input.amount,
      walletId: input.walletId,
      categoryId: input.categoryId,
      occurredOn: input.occurredOn,
      note: input.note,
    },
    Date.now(),
  )

  return getTransaction(db, userId, id)
}

export async function deleteTransaction(db: Database, userId: string, id: string) {
  const existing = await repo.findById(db, userId, id)
  if (!existing) throw new AppError('NOT_FOUND', 'transaction_not_found')
  await repo.remove(db, userId, id)
}

export async function listTransactions(db: Database, userId: string, query: ListTransactionsQuery) {
  const limit = clampLimit(query.limit)
  const cursor: Cursor | null = query.cursor ? decodeCursor(query.cursor) : null

  const rows = await repo.list(db, userId, {
    from: query.from,
    to: query.to,
    walletId: query.walletId,
    categoryId: query.categoryId,
    type: query.type,
    minAmount: query.minAmount,
    maxAmount: query.maxAmount,
    q: query.q,
    cursor: cursor ?? undefined,
    limit,
  })

  const hasMore = rows.length > limit
  const page = hasMore ? rows.slice(0, limit) : rows
  const last = page[page.length - 1]
  const nextCursor =
    hasMore && last ? encodeCursor({ occurredOn: last.occurredOn, id: last.id }) : null

  return { items: page.map(toResponse), nextCursor }
}

export async function exportTransactions(
  db: Database,
  userId: string,
  query: ListTransactionsQuery,
) {
  const rows = await repo.listAllForExport(
    db,
    userId,
    {
      from: query.from,
      to: query.to,
      walletId: query.walletId,
      categoryId: query.categoryId,
      type: query.type,
      minAmount: query.minAmount,
      maxAmount: query.maxAmount,
      q: query.q,
    },
    EXPORT_MAX_ROWS,
  )

  const truncated = rows.length > EXPORT_MAX_ROWS
  const page = truncated ? rows.slice(0, EXPORT_MAX_ROWS) : rows

  const csv = toCsv(
    ['date', 'type', 'category', 'wallet', 'amount', 'note'],
    page.map((row) => [
      row.occurredOn,
      row.categoryType,
      row.categoryName,
      row.walletName,
      String(row.amount),
      row.note ?? '',
    ]),
  )

  return { csv, truncated }
}
