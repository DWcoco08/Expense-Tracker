import { AppError, DEFAULT_CURRENCY, generateId } from '@expense/shared'
import type { Database } from '../../types'
import type { CreateWalletInput, UpdateWalletInput } from './model'
import * as repo from './repo'

type WalletTotalsRow = Awaited<ReturnType<typeof repo.listWithTotals>>[number]

// Số dư luôn tính ra, không lưu trong DB — xem srs.md mục 2.1
function toWalletResponse(row: WalletTotalsRow) {
  return {
    id: row.id,
    name: row.name,
    initialBalance: row.initialBalance,
    currentBalance: row.initialBalance + row.totalIncome - row.totalExpense,
    totalIncome: row.totalIncome,
    totalExpense: row.totalExpense,
    currency: row.currency,
    note: row.note,
    archivedAt: row.archivedAt,
  }
}

export async function listWallets(db: Database, userId: string, includeArchived: boolean) {
  const rows = await repo.listWithTotals(db, userId, includeArchived)
  return rows.map(toWalletResponse)
}

export async function getWallet(db: Database, userId: string, id: string) {
  const row = await repo.findWithTotalsById(db, userId, id)
  if (!row) throw new AppError('NOT_FOUND', 'wallet_not_found')
  return toWalletResponse(row)
}

export async function createWallet(db: Database, userId: string, input: CreateWalletInput) {
  const existing = await repo.findActiveByName(db, userId, input.name)
  if (existing) throw new AppError('DUPLICATE_NAME', 'wallet_name_taken')

  const now = Date.now()
  const wallet = await repo.insert(db, {
    id: generateId(),
    userId,
    name: input.name,
    initialBalance: input.initialBalance,
    currency: DEFAULT_CURRENCY,
    note: input.note ?? null,
    createdAt: now,
  })

  return getWallet(db, userId, wallet.id)
}

export async function updateWallet(
  db: Database,
  userId: string,
  id: string,
  input: UpdateWalletInput,
) {
  const existing = await repo.findById(db, userId, id)
  if (!existing) throw new AppError('NOT_FOUND', 'wallet_not_found')

  if (input.name && input.name !== existing.name) {
    const nameTaken = await repo.findActiveByName(db, userId, input.name)
    if (nameTaken) throw new AppError('DUPLICATE_NAME', 'wallet_name_taken')
  }

  await repo.update(db, userId, id, input, Date.now())
  return getWallet(db, userId, id)
}

export async function deleteWallet(db: Database, userId: string, id: string) {
  const existing = await repo.findById(db, userId, id)
  if (!existing) throw new AppError('NOT_FOUND', 'wallet_not_found')

  const count = await repo.countTransactions(db, id)
  if (count > 0) throw new AppError('WALLET_HAS_TRANSACTIONS', 'wallet_has_transactions')

  await repo.remove(db, userId, id)
}

export async function archiveWallet(db: Database, userId: string, id: string) {
  const existing = await repo.findById(db, userId, id)
  if (!existing) throw new AppError('NOT_FOUND', 'wallet_not_found')

  await repo.setArchived(db, userId, id, Date.now())
  return getWallet(db, userId, id)
}

// Dùng bởi module transactions để kiểm tra quyền sở hữu + trạng thái lưu trữ (BR-15)
// mà không phải chạy truy vấn tổng số dư nặng hơn của getWallet().
export async function assertUsable(db: Database, userId: string, id: string) {
  const wallet = await repo.findById(db, userId, id)
  if (!wallet) throw new AppError('NOT_FOUND', 'wallet_not_found')
  if (wallet.archivedAt !== null) throw new AppError('WALLET_ARCHIVED', 'wallet_archived')
  return wallet
}

export async function unarchiveWallet(db: Database, userId: string, id: string) {
  const existing = await repo.findById(db, userId, id)
  if (!existing) throw new AppError('NOT_FOUND', 'wallet_not_found')

  const nameTaken = await repo.findActiveByName(db, userId, existing.name)
  if (nameTaken) throw new AppError('DUPLICATE_NAME', 'wallet_name_taken')

  await repo.setArchived(db, userId, id, null)
  return getWallet(db, userId, id)
}
