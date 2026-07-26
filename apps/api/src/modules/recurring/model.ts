import { AMOUNT_MAX, AMOUNT_MIN, RECURRING_FREQUENCIES } from '@expense/shared'
import { z } from 'zod'

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'invalid_date_format')

export const createRecurringSchema = z.object({
  walletId: z.string().min(1),
  categoryId: z.string().min(1),
  amount: z.number().int().min(AMOUNT_MIN).max(AMOUNT_MAX),
  note: z.string().trim().max(255).nullish(),
  frequency: z.enum(RECURRING_FREQUENCIES),
  anchorDay: z.number().int().min(0).max(31).nullish(),
  startOn: dateSchema,
  endOn: dateSchema.nullish(),
})
export type CreateRecurringInput = z.infer<typeof createRecurringSchema>

export const updateRecurringSchema = z.object({
  amount: z.number().int().min(AMOUNT_MIN).max(AMOUNT_MAX).optional(),
  note: z.string().trim().max(255).nullish(),
  endOn: dateSchema.nullish(),
})
export type UpdateRecurringInput = z.infer<typeof updateRecurringSchema>
