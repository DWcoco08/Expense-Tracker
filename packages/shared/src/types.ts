export const CATEGORY_TYPES = ['income', 'expense'] as const

export type CategoryType = (typeof CATEGORY_TYPES)[number]

export const RECURRING_FREQUENCIES = ['daily', 'weekly', 'monthly'] as const

export type RecurringFrequency = (typeof RECURRING_FREQUENCIES)[number]

export const NOTIFICATION_TYPES = ['budget_exceeded', 'recurring_materialized'] as const

export type NotificationType = (typeof NOTIFICATION_TYPES)[number]
