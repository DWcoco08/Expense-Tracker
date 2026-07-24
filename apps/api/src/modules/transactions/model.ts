import {
  AMOUNT_MAX,
  AMOUNT_MIN,
  CATEGORY_TYPES,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from '@expense/shared'
import { z } from 'zod'

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'invalid_date_format')

export const createTransactionSchema = z.object({
  amount: z.number().int().min(AMOUNT_MIN).max(AMOUNT_MAX),
  walletId: z.string().min(1),
  categoryId: z.string().min(1),
  occurredOn: dateSchema,
  note: z.string().trim().max(255).nullish(),
})
export type CreateTransactionInput = z.infer<typeof createTransactionSchema>

export const updateTransactionSchema = z.object({
  amount: z.number().int().min(AMOUNT_MIN).max(AMOUNT_MAX).optional(),
  walletId: z.string().min(1).optional(),
  categoryId: z.string().min(1).optional(),
  occurredOn: dateSchema.optional(),
  note: z.string().trim().max(255).nullish(),
})
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>

export const listTransactionsQuerySchema = z.object({
  from: dateSchema.optional(),
  to: dateSchema.optional(),
  walletId: z.string().optional(),
  categoryId: z.string().optional(),
  type: z.enum(CATEGORY_TYPES).optional(),
  minAmount: z.coerce.number().int().optional(),
  maxAmount: z.coerce.number().int().optional(),
  q: z.string().trim().min(1).max(255).optional(),
  limit: z.coerce.number().int().positive().optional(),
  cursor: z.string().optional(),
})
export type ListTransactionsQuery = z.infer<typeof listTransactionsQuerySchema>

export function clampLimit(limit: number | undefined): number {
  if (!limit) return DEFAULT_PAGE_SIZE
  return Math.min(limit, MAX_PAGE_SIZE)
}
