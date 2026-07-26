import { AMOUNT_MAX, AMOUNT_MIN } from '@expense/shared'
import { z } from 'zod'

const monthSchema = z.string().regex(/^\d{4}-\d{2}$/, 'invalid_month_format')

export const createBudgetSchema = z.object({
  categoryId: z.string().min(1),
  month: monthSchema,
  amountLimit: z.number().int().min(AMOUNT_MIN).max(AMOUNT_MAX),
})
export type CreateBudgetInput = z.infer<typeof createBudgetSchema>

export const updateBudgetSchema = z.object({
  amountLimit: z.number().int().min(AMOUNT_MIN).max(AMOUNT_MAX),
})
export type UpdateBudgetInput = z.infer<typeof updateBudgetSchema>

export const listBudgetsQuerySchema = z.object({
  month: monthSchema,
})
export type ListBudgetsQuery = z.infer<typeof listBudgetsQuerySchema>
