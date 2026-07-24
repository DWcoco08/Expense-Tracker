import type { CategoryType } from '@expense/shared'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/state'
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
  const [actionError, setActionError] = useState<string | null>(null)

  const deleteCategory = useDeleteCategory()
  const archiveCategory = useArchiveCategory()

  function handleDelete(category: Category) {
    if (!window.confirm(`Xoá danh mục "${category.name}"?`)) return
    setActionError(null)
    deleteCategory.mutate(category.id, {
      onError: (err) => {
        if (err instanceof ApiError && err.code === 'CATEGORY_HAS_TRANSACTIONS') {
          setActionError(
            `${parseApiError(err)} Bấm "Lưu trữ" để ẩn danh mục này khỏi danh sách chọn.`,
          )
        } else {
          setActionError(parseApiError(err))
        }
      },
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">Danh mục</h1>
        <Button onClick={() => setDialogCategory('new')}>Thêm danh mục</Button>
      </div>

      <div className="flex gap-1 border-b border-neutral-200 dark:border-neutral-800">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            className={`px-4 py-2 text-sm font-medium ${
              tab === t.value
                ? 'border-b-2 border-neutral-900 text-neutral-900 dark:border-neutral-100 dark:text-neutral-100'
                : 'text-neutral-500 dark:text-neutral-400'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {actionError && (
        <div
          className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300"
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
        <ul className="grid gap-2 sm:grid-cols-2">
          {data.items.map((category) => (
            <li
              key={category.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900"
            >
              <div className="flex items-center gap-2">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: category.color ?? '#6b7280' }}
                />
                <span className="text-neutral-900 dark:text-neutral-100">{category.name}</span>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" onClick={() => setDialogCategory(category)}>
                  Sửa
                </Button>
                <Button variant="ghost" onClick={() => archiveCategory.mutate(category.id)}>
                  Lưu trữ
                </Button>
                <Button variant="ghost" onClick={() => handleDelete(category)}>
                  Xoá
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <CategoryFormDialog
        open={dialogCategory !== null}
        onClose={() => setDialogCategory(null)}
        type={tab}
        category={dialogCategory === 'new' ? undefined : (dialogCategory ?? undefined)}
      />
    </div>
  )
}
