import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/state'
import type { Budget } from '@/features/budgets/api'
import { BudgetFormDialog } from '@/features/budgets/budget-form-dialog'
import { useBudgets, useDeleteBudget } from '@/features/budgets/use-budgets'
import { currentLocalMonth, formatCurrency } from '@/lib/format'

export function BudgetsPage() {
  const [month, setMonth] = useState(currentLocalMonth())
  const { data, isLoading, isError, error } = useBudgets(month)
  const [dialogBudget, setDialogBudget] = useState<Budget | 'new' | null>(null)

  const deleteBudget = useDeleteBudget()

  function handleDelete(budget: Budget) {
    if (!window.confirm(`Xoá ngân sách cho "${budget.categoryName}"?`)) return
    deleteBudget.mutate(budget.id)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">Ngân sách</h1>
        <div className="flex items-center gap-2">
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="rounded-md border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
          />
          <Button onClick={() => setDialogBudget('new')}>Thêm ngân sách</Button>
        </div>
      </div>

      {isLoading && <LoadingState />}
      {isError && <ErrorState error={error} />}
      {data && data.items.length === 0 && (
        <EmptyState>Chưa có ngân sách nào trong tháng này.</EmptyState>
      )}

      {data && data.items.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2">
          {data.items.map((budget) => {
            const percent = Math.min(100, Math.round((budget.spent / budget.amountLimit) * 100))
            const overLimit = budget.spent > budget.amountLimit
            return (
              <li
                key={budget.id}
                className="space-y-2 rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="flex items-center gap-2 font-medium text-neutral-900 dark:text-neutral-100">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: budget.categoryColor ?? '#6b7280' }}
                    />
                    {budget.categoryName}
                  </span>
                  <div className="flex gap-1">
                    <Button variant="ghost" onClick={() => setDialogBudget(budget)}>
                      Sửa
                    </Button>
                    <Button variant="ghost" onClick={() => handleDelete(budget)}>
                      Xoá
                    </Button>
                  </div>
                </div>

                <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                  <div
                    className={`h-full ${overLimit ? 'bg-red-500' : 'bg-neutral-900 dark:bg-neutral-100'}`}
                    style={{ width: `${percent}%` }}
                  />
                </div>

                <p
                  className={`text-sm ${overLimit ? 'text-red-600 dark:text-red-400' : 'text-neutral-500 dark:text-neutral-400'}`}
                >
                  {formatCurrency(budget.spent)} / {formatCurrency(budget.amountLimit)}
                </p>
              </li>
            )
          })}
        </ul>
      )}

      <BudgetFormDialog
        open={dialogBudget !== null}
        onClose={() => setDialogBudget(null)}
        month={month}
        budget={dialogBudget === 'new' ? undefined : (dialogBudget ?? undefined)}
      />
    </div>
  )
}
