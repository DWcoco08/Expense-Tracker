import type { CategoryType } from '@expense/shared'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input, Select } from '@/components/ui/input'
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/state'
import type { Transaction } from '@/features/transactions/api'
import { TransactionFormDialog } from '@/features/transactions/transaction-form-dialog'
import { useDeleteTransaction, useTransactions } from '@/features/transactions/use-transactions'
import { useWallets } from '@/features/wallets/use-wallets'
import { parseApiError } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/format'

export function TransactionsPage() {
  const [type, setType] = useState<CategoryType | ''>('')
  const [walletId, setWalletId] = useState('')
  const [q, setQ] = useState('')

  const { data: wallets } = useWallets(false)

  const filters = {
    type: type || undefined,
    walletId: walletId || undefined,
    q: q || undefined,
  }
  const { data, isLoading, isError, error, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useTransactions(filters)

  const [dialogTransaction, setDialogTransaction] = useState<Transaction | 'new' | null>(null)
  const deleteTransaction = useDeleteTransaction()

  const items = data?.pages.flatMap((page) => page.items) ?? []

  function handleDelete(transaction: Transaction) {
    if (!window.confirm('Xoá giao dịch này?')) return
    deleteTransaction.mutate(transaction.id)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">Giao dịch</h1>
        <Button onClick={() => setDialogTransaction('new')}>Thêm giao dịch</Button>
      </div>

      <div className="grid gap-2 sm:grid-cols-4">
        <Select value={type} onChange={(e) => setType(e.target.value as CategoryType | '')}>
          <option value="">Tất cả loại</option>
          <option value="expense">Chi</option>
          <option value="income">Thu</option>
        </Select>
        <Select value={walletId} onChange={(e) => setWalletId(e.target.value)}>
          <option value="">Tất cả ví</option>
          {wallets?.items.map((wallet) => (
            <option key={wallet.id} value={wallet.id}>
              {wallet.name}
            </option>
          ))}
        </Select>
        <Input
          placeholder="Tìm trong ghi chú…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="sm:col-span-2"
        />
      </div>

      {isLoading && <LoadingState />}
      {isError && <ErrorState error={error} />}
      {items.length === 0 && !isLoading && !isError && (
        <EmptyState>Chưa có giao dịch nào khớp bộ lọc hiện tại.</EmptyState>
      )}

      {items.length > 0 && (
        <ul className="space-y-2">
          {items.map((transaction) => (
            <li
              key={transaction.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900"
            >
              <div className="flex items-center gap-3">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: transaction.category.color ?? '#6b7280' }}
                />
                <div>
                  <p className="text-neutral-900 dark:text-neutral-100">
                    {transaction.category.name}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {formatDate(transaction.occurredOn)} · {transaction.wallet.name}
                    {transaction.note ? ` · ${transaction.note}` : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`font-medium ${
                    transaction.type === 'income'
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-neutral-900 dark:text-neutral-100'
                  }`}
                >
                  {transaction.type === 'income' ? '+' : '-'}
                  {formatCurrency(transaction.amount)}
                </span>
                <Button variant="ghost" onClick={() => setDialogTransaction(transaction)}>
                  Sửa
                </Button>
                <Button variant="ghost" onClick={() => handleDelete(transaction)}>
                  Xoá
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {deleteTransaction.isError && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {parseApiError(deleteTransaction.error)}
        </p>
      )}

      {hasNextPage && (
        <div className="flex justify-center">
          <Button variant="secondary" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
            {isFetchingNextPage ? 'Đang tải…' : 'Tải thêm'}
          </Button>
        </div>
      )}

      <TransactionFormDialog
        open={dialogTransaction !== null}
        onClose={() => setDialogTransaction(null)}
        transaction={dialogTransaction === 'new' ? undefined : (dialogTransaction ?? undefined)}
      />
    </div>
  )
}
