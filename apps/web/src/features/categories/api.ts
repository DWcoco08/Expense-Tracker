import type { CategoryType } from '@expense/shared'
import { api } from '@/lib/api'

export interface Category {
  id: string
  name: string
  type: CategoryType
  icon: string | null
  color: string | null
  archivedAt: number | null
}

export interface CreateCategoryInput {
  name: string
  type: CategoryType
  icon?: string | null
  color?: string | null
}

export interface UpdateCategoryInput {
  name?: string
  icon?: string | null
  color?: string | null
}

export function listCategories(type?: CategoryType) {
  return api.get<{ items: Category[]; nextCursor: string | null }>(
    '/categories',
    type ? { type } : undefined,
  )
}

export function createCategory(input: CreateCategoryInput) {
  return api.post<Category>('/categories', input)
}

export function updateCategory(id: string, input: UpdateCategoryInput) {
  return api.patch<Category>(`/categories/${id}`, input)
}

export function deleteCategory(id: string) {
  return api.delete<undefined>(`/categories/${id}`)
}

export function archiveCategory(id: string) {
  return api.post<Category>(`/categories/${id}/archive`)
}
