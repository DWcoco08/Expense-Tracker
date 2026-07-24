import { z } from 'zod'

export const createWalletSchema = z.object({
  name: z.string().trim().min(1).max(50),
  initialBalance: z.number().int().min(0),
  note: z.string().trim().max(255).nullish(),
})
export type CreateWalletInput = z.infer<typeof createWalletSchema>

export const updateWalletSchema = z.object({
  name: z.string().trim().min(1).max(50).optional(),
  initialBalance: z.number().int().min(0).optional(),
  note: z.string().trim().max(255).nullish(),
})
export type UpdateWalletInput = z.infer<typeof updateWalletSchema>

export const listWalletsQuerySchema = z.object({
  includeArchived: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
})
export type ListWalletsQuery = z.infer<typeof listWalletsQuerySchema>
