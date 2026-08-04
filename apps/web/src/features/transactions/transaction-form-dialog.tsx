import type { CategoryType } from '@expense/shared'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Field, Input, Select } from '@/components/ui/input'
import { useCategories } from '@/features/categories/use-categories'
import { useWallets } from '@/features/wallets/use-wallets'
import { parseApiError } from '@/lib/api'
import { todayLocalDate } from '@/lib/format'
import type { Transaction } from './api'
import { useCreateTransaction, useUpdateTransaction } from './use-transactions'

interface TransactionFormDialogProps {
  open: boolean
  onClose: () => void
  transaction?: Transaction
}

export function TransactionFormDialog({ open, onClose, transaction }: TransactionFormDialogProps) {
  const isEdit = Boolean(transaction)

  const [type, setType] = useState<CategoryType>(transaction?.type ?? 'expense')
  const [amount, setAmount] = useState(String(transaction?.amount ?? ''))
  const [walletId, setWalletId] = useState(transaction?.wallet.id ?? '')
  const [categoryId, setCategoryId] = useState(transaction?.category.id ?? '')
  const [occurredOn, setOccurredOn] = useState(transaction?.occurredOn ?? todayLocalDate())
  const [note, setNote] = useState(transaction?.note ?? '')

  const { data: wallets } = useWallets(false)
  const { data: categories } = useCategories(type)

  const create = useCreateTransaction()
  const update = useUpdateTransaction()
  const pending = create.isPending || update.isPending
  const error = create.error ?? update.error

  function resetForm() {
    setAmount('')
    setWalletId('')
    setCategoryId('')
    setOccurredOn(todayLocalDate())
    setNote('')
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const payload = {
      amount: Number(amount),
      walletId,
      categoryId,
      occurredOn,
      note: note || null,
    }

    if (isEdit && transaction) {
      update.mutate({ id: transaction.id, input: payload }, { onSuccess: onClose })
    } else {
      create.mutate(payload, {
        onSuccess: () => {
          onClose()
          resetForm()
        },
      })
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={isEdit ? 'Sửa giao dịch' : 'Thêm giao dịch'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setType('expense')
              setCategoryId('')
            }}
            className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium ${
              type === 'expense'
                ? 'border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900'
                : 'border-neutral-300 text-neutral-600 dark:border-neutral-700 dark:text-neutral-400'
            }`}
          >
            Chi
          </button>
          <button
            type="button"
            onClick={() => {
              setType('income')
              setCategoryId('')
            }}
            className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium ${
              type === 'income'
                ? 'border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900'
                : 'border-neutral-300 text-neutral-600 dark:border-neutral-700 dark:text-neutral-400'
            }`}
          >
            Thu
          </button>
        </div>

        <Field label="Số tiền" htmlFor="tx-amount">
          <Input
            id="tx-amount"
            type="number"
            min={1}
            step={1}
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </Field>

        <Field label="Ví" htmlFor="tx-wallet">
          <Select
            id="tx-wallet"
            required
            value={walletId}
            onChange={(e) => setWalletId(e.target.value)}
          >
            <option value="" disabled>
              Chọn ví
            </option>
            {wallets?.items.map((wallet) => (
              <option key={wallet.id} value={wallet.id}>
                {wallet.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Danh mục" htmlFor="tx-category">
          <Select
            id="tx-category"
            required
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="" disabled>
              Chọn danh mục
            </option>
            {categories?.items.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Ngày" htmlFor="tx-date">
          <Input
            id="tx-date"
            type="date"
            required
            max={todayLocalDate()}
            value={occurredOn}
            onChange={(e) => setOccurredOn(e.target.value)}
          />
        </Field>

        <Field label="Ghi chú" htmlFor="tx-note">
          <Input id="tx-note" value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {parseApiError(error)}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Huỷ
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? 'Đang lưu…' : 'Lưu'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
