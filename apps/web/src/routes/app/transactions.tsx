import type { CategoryType } from '@expense/shared'
import { Download, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Input, Select } from '@/components/ui/input'
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/state'
import { Table, TBody, Td, THead, Th } from '@/components/ui/table'
import { useToast } from '@/components/ui/toast'
import type { Transaction } from '@/features/transactions/api'
import { downloadTransactionsCsv } from '@/features/transactions/api'
import { TransactionFormDialog } from '@/features/transactions/transaction-form-dialog'
import { useDeleteTransaction, useTransactions } from '@/features/transactions/use-transactions'
import { useWallets } from '@/features/wallets/use-wallets'
import { parseApiError } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/format'

export function TransactionsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const type = (searchParams.get('type') ?? '') as CategoryType | ''
  const walletId = searchParams.get('walletId') ?? ''
  const q = searchParams.get('q') ?? ''

  function updateFilter(key: string, value: string) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (value) {
          next.set(key, value)
        } else {
          next.delete(key)
        }
        return next
      },
      { replace: true },
    )
  }

  const { data: wallets } = useWallets(false)

  const filters = {
    type: type || undefined,
    walletId: walletId || undefined,
    q: q || undefined,
  }
  const { data, isLoading, isError, error, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useTransactions(filters)

  const [dialogTransaction, setDialogTransaction] = useState<Transaction | 'new' | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null)
  const deleteTransaction = useDeleteTransaction()
  const [exportError, setExportError] = useState<string | null>(null)
  const { showToast } = useToast()

  const items = data?.pages.flatMap((page) => page.items) ?? []

  function handleDelete() {
    if (!deleteTarget) return
    deleteTransaction.mutate(deleteTarget.id, {
      onSuccess: () => {
        setDeleteTarget(null)
        showToast('Đã xoá')
      },
    })
  }

  function handleExport() {
    setExportError(null)
    downloadTransactionsCsv(filters).catch((err) => setExportError(parseApiError(err)))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Giao dịch</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4" />
            Xuất CSV
          </Button>
          <Button onClick={() => setDialogTransaction('new')}>
            <Plus className="h-4 w-4" />
            Thêm giao dịch
          </Button>
        </div>
      </div>

      {exportError && (
        <p className="text-sm text-status-danger-text" role="alert">
          {exportError}
        </p>
      )}

      <div className="grid gap-2 sm:grid-cols-4">
        <Select value={type} onChange={(e) => updateFilter('type', e.target.value)}>
          <option value="">Tất cả loại</option>
          <option value="expense">Chi</option>
          <option value="income">Thu</option>
        </Select>
        <Select value={walletId} onChange={(e) => updateFilter('walletId', e.target.value)}>
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
          onChange={(e) => updateFilter('q', e.target.value)}
          className="sm:col-span-2"
        />
      </div>

      {isLoading && <LoadingState />}
      {isError && <ErrorState error={error} />}
      {items.length === 0 && !isLoading && !isError && (
        <EmptyState>Chưa có giao dịch nào khớp bộ lọc hiện tại.</EmptyState>
      )}

      {items.length > 0 && (
        <Table>
          <THead>
            <tr>
              <Th>Ngày</Th>
              <Th>Danh mục</Th>
              <Th>Ví</Th>
              <Th>Ghi chú</Th>
              <Th>Số tiền</Th>
              <Th className="text-right">Thao tác</Th>
            </tr>
          </THead>
          <TBody>
            {items.map((transaction) => (
              <tr key={transaction.id}>
                <Td className="text-muted-foreground">{formatDate(transaction.occurredOn)}</Td>
                <Td>
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: transaction.category.color ?? '#6b7280' }}
                    />
                    {transaction.category.name}
                  </div>
                </Td>
                <Td className="text-muted-foreground">{transaction.wallet.name}</Td>
                <Td className="text-muted-foreground">{transaction.note || '—'}</Td>
                <Td>
                  <span
                    className={`font-medium ${
                      transaction.type === 'income' ? 'text-status-success-text' : 'text-foreground'
                    }`}
                  >
                    {transaction.type === 'income' ? '+' : '-'}
                    {formatCurrency(transaction.amount)}
                  </span>
                </Td>
                <Td>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDialogTransaction(transaction)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Sửa
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setDeleteTarget(transaction)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Xoá
                    </Button>
                  </div>
                </Td>
              </tr>
            ))}
          </TBody>
        </Table>
      )}

      {deleteTransaction.isError && (
        <p className="text-sm text-status-danger-text" role="alert">
          {parseApiError(deleteTransaction.error)}
        </p>
      )}

      {hasNextPage && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
            {isFetchingNextPage ? 'Đang tải…' : 'Tải thêm'}
          </Button>
        </div>
      )}

      <TransactionFormDialog
        open={dialogTransaction !== null}
        onClose={() => setDialogTransaction(null)}
        transaction={dialogTransaction === 'new' ? undefined : (dialogTransaction ?? undefined)}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Xoá giao dịch"
        description="Xoá giao dịch này? Hành động này không thể hoàn tác."
        pending={deleteTransaction.isPending}
      />
    </div>
  )
}
