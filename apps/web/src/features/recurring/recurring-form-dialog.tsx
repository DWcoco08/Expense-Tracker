import type { CategoryType } from '@expense/shared'
import { Save } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Field, Input, Select } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { useCategories } from '@/features/categories/use-categories'
import { useWallets } from '@/features/wallets/use-wallets'
import { parseApiError } from '@/lib/api'
import { todayLocalDate } from '@/lib/format'
import type { RecurringFrequency, RecurringTransaction } from './api'
import { useCreateRecurring, useUpdateRecurring } from './use-recurring'

const FREQUENCY_LABELS: Record<RecurringFrequency, string> = {
  daily: 'Hằng ngày',
  weekly: 'Hằng tuần',
  monthly: 'Hằng tháng',
}

interface RecurringFormDialogProps {
  open: boolean
  onClose: () => void
  recurring?: RecurringTransaction
}

export function RecurringFormDialog({ open, onClose, recurring }: RecurringFormDialogProps) {
  const isEdit = Boolean(recurring)

  const [type, setType] = useState<CategoryType>('expense')
  const [walletId, setWalletId] = useState(recurring?.walletId ?? '')
  const [categoryId, setCategoryId] = useState(recurring?.categoryId ?? '')
  const [amount, setAmount] = useState(String(recurring?.amount ?? ''))
  const [note, setNote] = useState(recurring?.note ?? '')
  const [frequency, setFrequency] = useState<RecurringFrequency>(recurring?.frequency ?? 'monthly')
  const [anchorDay, setAnchorDay] = useState(String(recurring?.anchorDay ?? 1))
  const [startOn, setStartOn] = useState(recurring?.startOn ?? todayLocalDate())
  const [endOn, setEndOn] = useState(recurring?.endOn ?? '')

  const { data: wallets } = useWallets(false)
  const { data: categories } = useCategories(type)

  const create = useCreateRecurring()
  const update = useUpdateRecurring()
  const pending = create.isPending || update.isPending
  const error = create.error ?? update.error
  const { showToast } = useToast()

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()

    if (isEdit && recurring) {
      update.mutate(
        {
          id: recurring.id,
          input: {
            amount: Number(amount),
            note: note || null,
            endOn: endOn || null,
          },
        },
        {
          onSuccess: () => {
            onClose()
            showToast('Đã lưu')
          },
        },
      )
      return
    }

    create.mutate(
      {
        walletId,
        categoryId,
        amount: Number(amount),
        note: note || null,
        frequency,
        anchorDay: frequency === 'monthly' ? Number(anchorDay) : null,
        startOn,
        endOn: endOn || null,
      },
      {
        onSuccess: () => {
          onClose()
          showToast('Đã lưu')
        },
      },
    )
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEdit ? 'Sửa giao dịch định kỳ' : 'Thêm giao dịch định kỳ'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {!isEdit && (
          <>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setType('expense')
                  setCategoryId('')
                }}
                className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium ${
                  type === 'expense'
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-input text-muted-foreground'
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
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-input text-muted-foreground'
                }`}
              >
                Thu
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Ví" htmlFor="recurring-wallet">
                <Select
                  id="recurring-wallet"
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

              <Field label="Danh mục" htmlFor="recurring-category">
                <Select
                  id="recurring-category"
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
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Tần suất" htmlFor="recurring-frequency">
                <Select
                  id="recurring-frequency"
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as RecurringFrequency)}
                >
                  {Object.entries(FREQUENCY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </Field>

              {frequency === 'monthly' && (
                <Field label="Ngày trong tháng (1-28)" htmlFor="recurring-anchor">
                  <Input
                    id="recurring-anchor"
                    type="number"
                    min={1}
                    max={28}
                    required
                    value={anchorDay}
                    onChange={(e) => setAnchorDay(e.target.value)}
                  />
                </Field>
              )}
            </div>

            <Field label="Ngày bắt đầu" htmlFor="recurring-start">
              <Input
                id="recurring-start"
                type="date"
                required
                value={startOn}
                onChange={(e) => setStartOn(e.target.value)}
              />
            </Field>
          </>
        )}

        <Field label="Số tiền" htmlFor="recurring-amount">
          <Input
            id="recurring-amount"
            type="number"
            min={1}
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </Field>

        <Field label="Ghi chú" htmlFor="recurring-note">
          <Input id="recurring-note" value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>

        <Field label="Ngày kết thúc (tuỳ chọn)" htmlFor="recurring-end">
          <Input
            id="recurring-end"
            type="date"
            value={endOn}
            onChange={(e) => setEndOn(e.target.value)}
          />
        </Field>

        {error && (
          <p className="text-sm text-status-danger-text" role="alert">
            {parseApiError(error)}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Huỷ
          </Button>
          <Button type="submit" disabled={pending}>
            <Save className="h-4 w-4" />
            {pending ? 'Đang lưu…' : 'Lưu'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
