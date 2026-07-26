import { z } from 'zod'

export const listNotificationsQuerySchema = z.object({
  limit: z.coerce.number().int().positive().optional(),
  cursor: z.string().optional(),
})
export type ListNotificationsQuery = z.infer<typeof listNotificationsQuerySchema>
