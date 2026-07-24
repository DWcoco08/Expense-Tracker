import { z } from 'zod'

const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'invalid_month_format')

export const dashboardQuerySchema = z.object({
  month: monthSchema.optional(),
})
export type DashboardQuery = z.infer<typeof dashboardQuerySchema>

export const overviewQuerySchema = z.object({
  from: monthSchema,
  to: monthSchema,
})
export type OverviewQuery = z.infer<typeof overviewQuerySchema>
