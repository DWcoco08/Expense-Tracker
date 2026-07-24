import { CATEGORY_TYPES } from '@expense/shared'
import { z } from 'zod'

export const createCategorySchema = z.object({
  name: z.string().trim().min(1).max(50),
  type: z.enum(CATEGORY_TYPES),
  icon: z.string().trim().max(50).nullish(),
  color: z.string().trim().max(20).nullish(),
})
export type CreateCategoryInput = z.infer<typeof createCategorySchema>

export const updateCategorySchema = z.object({
  name: z.string().trim().min(1).max(50).optional(),
  icon: z.string().trim().max(50).nullish(),
  color: z.string().trim().max(20).nullish(),
  // Chỉ khai báo để phát hiện yêu cầu đổi type và từ chối rõ ràng (BR-12).
  // Không dùng để ghi — service so sánh với type hiện có trước khi từ chối.
  type: z.enum(CATEGORY_TYPES).optional(),
})
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>

export const listCategoriesQuerySchema = z.object({
  type: z.enum(CATEGORY_TYPES).optional(),
})
export type ListCategoriesQuery = z.infer<typeof listCategoriesQuerySchema>
