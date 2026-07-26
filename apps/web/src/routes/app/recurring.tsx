import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/state'
import type { RecurringFrequency, RecurringTransaction } from '@/features/recurring/api'
import { RecurringFormDialog } from '@/features/recurring/recurring-form-dialog'
import {
  useArchiveRecurring,
  useDeleteRecurring,
  useRecurringList,
  useUnarchiveRecurring,
} from '@/features/recurring/use-recurring'
import { formatCurrency, formatDate } from '@/lib/format'

const FREQUENCY_LABELS: Record<RecurringFrequency, string> = {
  daily: 'Hằng ngày',
  weekly: 'Hằng tuần',
  monthly: 'Hằng tháng',
}

export function RecurringPage() {
  const { data, isLoading, isError, error } = useRecurringList()
  const [dialogItem, setDialogItem] = useState<RecurringTransaction | 'new' | null>(null)

  const deleteRecurring = useDeleteRecurring()
  const archiveRecurring = useArchiveRecurring()
  const unarchiveRecurring = useUnarchiveRecurring()

  function handleDelete(item: RecurringTransaction) {
    if (!window.confirm('Xoá giao dịch định kỳ này?')) return
    deleteRecurring.mutate(item.id)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
          Giao dịch định kỳ
        </h1>
        <Button onClick={() => setDialogItem('new')}>Thêm định kỳ</Button>
      </div>

      {isLoading && <LoadingState />}
      {isError && <ErrorState error={error} />}
      {data && data.items.length === 0 && <EmptyState>Chưa có giao dịch định kỳ nào.</EmptyState>}

      {data && data.items.length > 0 && (
        <ul className="space-y-2">
          {data.items.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900"
            >
              <div>
                <p className="font-medium text-neutral-900 dark:text-neutral-100">
                  {formatCurrency(item.amount)}
                  {item.archivedAt && (
                    <span className="ml-2 text-xs font-normal text-neutral-500 dark:text-neutral-400">
                      (đã tạm dừng)
                    </span>
                  )}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {FREQUENCY_LABELS[item.frequency]} · lần kế tiếp {formatDate(item.nextRunOn)}
                </p>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" onClick={() => setDialogItem(item)}>
                  Sửa
                </Button>
                {item.archivedAt ? (
                  <Button variant="ghost" onClick={() => unarchiveRecurring.mutate(item.id)}>
                    Tiếp tục
                  </Button>
                ) : (
                  <Button variant="ghost" onClick={() => archiveRecurring.mutate(item.id)}>
                    Tạm dừng
                  </Button>
                )}
                <Button variant="ghost" onClick={() => handleDelete(item)}>
                  Xoá
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <RecurringFormDialog
        open={dialogItem !== null}
        onClose={() => setDialogItem(null)}
        recurring={dialogItem === 'new' ? undefined : (dialogItem ?? undefined)}
      />
    </div>
  )
}
