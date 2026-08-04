import type { CategoryType } from '@expense/shared'
import { Archive, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/state'
import { Table, TBody, Td, THead, Th } from '@/components/ui/table'
import { useToast } from '@/components/ui/toast'
import type { Category } from '@/features/categories/api'
import { CategoryFormDialog } from '@/features/categories/category-form-dialog'
import {
  useArchiveCategory,
  useCategories,
  useDeleteCategory,
} from '@/features/categories/use-categories'
import { ApiError, parseApiError } from '@/lib/api'

const TABS: { value: CategoryType; label: string }[] = [
  { value: 'expense', label: 'Chi' },
  { value: 'income', label: 'Thu' },
]

export function CategoriesPage() {
  const [tab, setTab] = useState<CategoryType>('expense')
  const { data, isLoading, isError, error } = useCategories(tab)

  const [dialogCategory, setDialogCategory] = useState<Category | 'new' | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const deleteCategory = useDeleteCategory()
  const archiveCategory = useArchiveCategory()
  const { showToast } = useToast()

  function handleDelete() {
    if (!deleteTarget) return
    setActionError(null)
    deleteCategory.mutate(deleteTarget.id, {
      onSuccess: () => {
        setDeleteTarget(null)
        showToast('Đã xoá')
      },
      onError: (err) => {
        if (err instanceof ApiError && err.code === 'CATEGORY_HAS_TRANSACTIONS') {
          setActionError(
            `${parseApiError(err)} Bấm "Lưu trữ" để ẩn danh mục này khỏi danh sách chọn.`,
          )
        } else {
          setActionError(parseApiError(err))
        }
        setDeleteTarget(null)
      },
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Danh mục</h1>
        <Button onClick={() => setDialogCategory('new')}>
          <Plus className="h-4 w-4" />
          Thêm danh mục
        </Button>
      </div>

      <div className="flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            className={`px-4 py-2 text-sm font-medium ${
              tab === t.value
                ? 'border-b-2 border-primary text-foreground'
                : 'text-muted-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {actionError && (
        <div
          className="rounded-md border border-status-danger-text/30 bg-status-danger-surface px-3 py-2 text-sm text-status-danger-text"
          role="alert"
        >
          {actionError}
        </div>
      )}

      {isLoading && <LoadingState />}
      {isError && <ErrorState error={error} />}
      {data && data.items.length === 0 && (
        <EmptyState>Chưa có danh mục nào trong nhóm này.</EmptyState>
      )}

      {data && data.items.length > 0 && (
        <Table>
          <THead>
            <tr>
              <Th>Danh mục</Th>
              <Th className="text-right">Thao tác</Th>
            </tr>
          </THead>
          <TBody>
            {data.items.map((category) => (
              <tr key={category.id}>
                <Td>
                  <div className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: category.color ?? '#6b7280' }}
                    />
                    <span>{category.name}</span>
                  </div>
                </Td>
                <Td>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => setDialogCategory(category)}>
                      <Pencil className="h-3.5 w-3.5" />
                      Sửa
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => archiveCategory.mutate(category.id)}
                    >
                      <Archive className="h-3.5 w-3.5" />
                      Lưu trữ
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setDeleteTarget(category)}
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

      <CategoryFormDialog
        open={dialogCategory !== null}
        onClose={() => setDialogCategory(null)}
        type={tab}
        category={dialogCategory === 'new' ? undefined : (dialogCategory ?? undefined)}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Xoá danh mục"
        description={`Xoá danh mục "${deleteTarget?.name}"? Hành động này không thể hoàn tác.`}
        pending={deleteCategory.isPending}
      />
    </div>
  )
}
