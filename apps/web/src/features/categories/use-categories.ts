import type { CategoryType } from '@expense/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as categoriesApi from './api'

const CATEGORIES_KEY = ['categories']

export function useCategories(type?: CategoryType) {
  return useQuery({
    queryKey: [...CATEGORIES_KEY, { type }],
    queryFn: () => categoriesApi.listCategories(type),
  })
}

function useInvalidateCategories() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: CATEGORIES_KEY })
}

export function useCreateCategory() {
  const invalidate = useInvalidateCategories()
  return useMutation({ mutationFn: categoriesApi.createCategory, onSuccess: invalidate })
}

export function useUpdateCategory() {
  const invalidate = useInvalidateCategories()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: categoriesApi.UpdateCategoryInput }) =>
      categoriesApi.updateCategory(id, input),
    onSuccess: invalidate,
  })
}

export function useDeleteCategory() {
  const invalidate = useInvalidateCategories()
  return useMutation({ mutationFn: categoriesApi.deleteCategory, onSuccess: invalidate })
}

export function useArchiveCategory() {
  const invalidate = useInvalidateCategories()
  return useMutation({ mutationFn: categoriesApi.archiveCategory, onSuccess: invalidate })
}
