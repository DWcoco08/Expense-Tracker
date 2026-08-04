import { Archive, ArchiveRestore, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/state'
import { Table, TBody, Td, THead, Th } from '@/components/ui/table'
import { useToast } from '@/components/ui/toast'
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
  const [deleteTarget, setDeleteTarget] = useState<RecurringTransaction | null>(null)

  const deleteRecurring = useDeleteRecurring()
  const archiveRecurring = useArchiveRecurring()
  const unarchiveRecurring = useUnarchiveRecurring()
  const { showToast } = useToast()

  function handleDelete() {
    if (!deleteTarget) return
    deleteRecurring.mutate(deleteTarget.id, {
      onSuccess: () => {
        setDeleteTarget(null)
        showToast('Đã xoá')
      },
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Giao dịch định kỳ</h1>
        <Button onClick={() => setDialogItem('new')}>
          <Plus className="h-4 w-4" />
          Thêm định kỳ
        </Button>
      </div>

      {isLoading && <LoadingState />}
      {isError && <ErrorState error={error} />}
      {data && data.items.length === 0 && <EmptyState>Chưa có giao dịch định kỳ nào.</EmptyState>}

      {data && data.items.length > 0 && (
        <Table>
          <THead>
            <tr>
              <Th>Số tiền</Th>
              <Th>Tần suất</Th>
              <Th>Lần kế tiếp</Th>
              <Th>Trạng thái</Th>
              <Th className="text-right">Thao tác</Th>
            </tr>
          </THead>
          <TBody>
            {data.items.map((item) => (
              <tr key={item.id}>
                <Td className="font-medium">{formatCurrency(item.amount)}</Td>
                <Td>{FREQUENCY_LABELS[item.frequency]}</Td>
                <Td>{formatDate(item.nextRunOn)}</Td>
                <Td>
                  {item.archivedAt ? (
                    <Badge>Đã tạm dừng</Badge>
                  ) : (
                    <Badge tone="success">Đang chạy</Badge>
                  )}
                </Td>
                <Td>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => setDialogItem(item)}>
                      <Pencil className="h-3.5 w-3.5" />
                      Sửa
                    </Button>
                    {item.archivedAt ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => unarchiveRecurring.mutate(item.id)}
                      >
                        <ArchiveRestore className="h-3.5 w-3.5" />
                        Tiếp tục
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => archiveRecurring.mutate(item.id)}
                      >
                        <Archive className="h-3.5 w-3.5" />
                        Tạm dừng
                      </Button>
                    )}
                    <Button variant="destructive" size="sm" onClick={() => setDeleteTarget(item)}>
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

      <RecurringFormDialog
        open={dialogItem !== null}
        onClose={() => setDialogItem(null)}
        recurring={dialogItem === 'new' ? undefined : (dialogItem ?? undefined)}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Xoá giao dịch định kỳ"
        description="Xoá giao dịch định kỳ này? Hành động này không thể hoàn tác."
        pending={deleteRecurring.isPending}
      />
    </div>
  )
}
