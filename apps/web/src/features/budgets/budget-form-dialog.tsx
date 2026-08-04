import { Save } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Field, Input, Select } from '@/components/ui/input'
import { useCategories } from '@/features/categories/use-categories'
import { parseApiError } from '@/lib/api'
import type { Budget } from './api'
import { useCreateBudget, useUpdateBudget } from './use-budgets'

interface BudgetFormDialogProps {
  open: boolean
  onClose: () => void
  month: string
  budget?: Budget
}

export function BudgetFormDialog({ open, onClose, month, budget }: BudgetFormDialogProps) {
  const isEdit = Boolean(budget)
  const { data: categoriesData } = useCategories('expense')
  const [categoryId, setCategoryId] = useState(budget?.categoryId ?? '')
  const [amountLimit, setAmountLimit] = useState(String(budget?.amountLimit ?? ''))

  const create = useCreateBudget()
  const update = useUpdateBudget()
  const pending = create.isPending || update.isPending
  const error = create.error ?? update.error

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const parsedAmount = Number(amountLimit)

    if (isEdit && budget) {
      update.mutate({ id: budget.id, input: { amountLimit: parsedAmount } }, { onSuccess: onClose })
    } else {
      create.mutate(
        { categoryId, month, amountLimit: parsedAmount },
        {
          onSuccess: () => {
            onClose()
            setCategoryId('')
            setAmountLimit('')
          },
        },
      )
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={isEdit ? 'Sửa ngân sách' : 'Thêm ngân sách'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Danh mục" htmlFor="budget-category">
          {isEdit ? (
            <Input id="budget-category" disabled value={budget?.categoryName ?? ''} />
          ) : (
            <Select
              id="budget-category"
              required
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="" disabled>
                Chọn danh mục
              </option>
              {categoriesData?.items.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <Field label="Hạn mức (đồng)" htmlFor="budget-amount">
          <Input
            id="budget-amount"
            type="number"
            required
            min={1}
            value={amountLimit}
            onChange={(e) => setAmountLimit(e.target.value)}
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
