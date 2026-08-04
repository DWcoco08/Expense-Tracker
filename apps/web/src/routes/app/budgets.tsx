import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/state'
import { Table, TBody, Td, THead, Th } from '@/components/ui/table'
import type { Budget } from '@/features/budgets/api'
import { BudgetFormDialog } from '@/features/budgets/budget-form-dialog'
import { useBudgets, useDeleteBudget } from '@/features/budgets/use-budgets'
import { currentLocalMonth, formatCurrency } from '@/lib/format'

export function BudgetsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const month = searchParams.get('month') ?? currentLocalMonth()

  function handleMonthChange(value: string) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.set('month', value)
        return next
      },
      { replace: true },
    )
  }

  const { data, isLoading, isError, error } = useBudgets(month)
  const [dialogBudget, setDialogBudget] = useState<Budget | 'new' | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Budget | null>(null)

  const deleteBudget = useDeleteBudget()

  function handleDelete() {
    if (!deleteTarget) return
    deleteBudget.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold text-foreground">Ngân sách</h1>
        <div className="flex items-center gap-2">
          <input
            type="month"
            value={month}
            onChange={(e) => handleMonthChange(e.target.value)}
            className="rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground"
          />
          <Button onClick={() => setDialogBudget('new')}>
            <Plus className="h-4 w-4" />
            Thêm ngân sách
          </Button>
        </div>
      </div>

      {isLoading && <LoadingState />}
      {isError && <ErrorState error={error} />}
      {data && data.items.length === 0 && (
        <EmptyState>Chưa có ngân sách nào trong tháng này.</EmptyState>
      )}

      {data && data.items.length > 0 && (
        <Table>
          <THead>
            <tr>
              <Th>Danh mục</Th>
              <Th>Chi tiêu</Th>
              <Th className="text-right">Thao tác</Th>
            </tr>
          </THead>
          <TBody>
            {data.items.map((budget) => {
              const percent = Math.min(100, Math.round((budget.spent / budget.amountLimit) * 100))
              const overLimit = budget.spent > budget.amountLimit
              return (
                <tr key={budget.id}>
                  <Td>
                    <div className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: budget.categoryColor ?? '#6b7280' }}
                      />
                      <span className="font-medium">{budget.categoryName}</span>
                      {overLimit && <Badge tone="danger">Vượt hạn mức</Badge>}
                    </div>
                  </Td>
                  <Td>
                    <div className="min-w-40 space-y-1.5">
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full ${overLimit ? 'bg-destructive' : 'bg-primary'}`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <p
                        className={`text-xs ${overLimit ? 'text-status-danger-text' : 'text-muted-foreground'}`}
                      >
                        {formatCurrency(budget.spent)} / {formatCurrency(budget.amountLimit)}
                      </p>
                    </div>
                  </Td>
                  <Td>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => setDialogBudget(budget)}>
                        <Pencil className="h-3.5 w-3.5" />
                        Sửa
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setDeleteTarget(budget)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Xoá
                      </Button>
                    </div>
                  </Td>
                </tr>
              )
            })}
          </TBody>
        </Table>
      )}

      <BudgetFormDialog
        open={dialogBudget !== null}
        onClose={() => setDialogBudget(null)}
        month={month}
        budget={dialogBudget === 'new' ? undefined : (dialogBudget ?? undefined)}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Xoá ngân sách"
        description={`Xoá ngân sách cho "${deleteTarget?.categoryName}"? Hành động này không thể hoàn tác.`}
        pending={deleteBudget.isPending}
      />
    </div>
  )
}
