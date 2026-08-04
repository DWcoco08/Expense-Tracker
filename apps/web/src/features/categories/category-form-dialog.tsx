import type { CategoryType } from '@expense/shared'
import { Save } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Field, Input } from '@/components/ui/input'
import { parseApiError } from '@/lib/api'
import type { Category } from './api'
import { useCreateCategory, useUpdateCategory } from './use-categories'

interface CategoryFormDialogProps {
  open: boolean
  onClose: () => void
  type: CategoryType
  category?: Category
}

export function CategoryFormDialog({ open, onClose, type, category }: CategoryFormDialogProps) {
  const isEdit = Boolean(category)
  const [name, setName] = useState(category?.name ?? '')
  const [icon, setIcon] = useState(category?.icon ?? '')
  const [color, setColor] = useState(category?.color ?? '#6b7280')

  const create = useCreateCategory()
  const update = useUpdateCategory()
  const pending = create.isPending || update.isPending
  const error = create.error ?? update.error

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const payload = { name, icon: icon || null, color: color || null }

    if (isEdit && category) {
      update.mutate({ id: category.id, input: payload }, { onSuccess: onClose })
    } else {
      create.mutate(
        { ...payload, type },
        {
          onSuccess: () => {
            onClose()
            setName('')
            setIcon('')
          },
        },
      )
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={
        isEdit ? 'Sửa danh mục' : type === 'expense' ? 'Thêm danh mục chi' : 'Thêm danh mục thu'
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Tên danh mục" htmlFor="category-name">
          <Input
            id="category-name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>

        <Field label="Biểu tượng (tuỳ chọn)" htmlFor="category-icon">
          <Input
            id="category-icon"
            placeholder="vd: coffee"
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
          />
        </Field>

        <Field label="Màu" htmlFor="category-color">
          <input
            id="category-color"
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-9 w-16 rounded border border-input"
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
