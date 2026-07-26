export const CATEGORY_TYPES = ['income', 'expense'] as const

export type CategoryType = (typeof CATEGORY_TYPES)[number]

export const RECURRING_FREQUENCIES = ['daily', 'weekly', 'monthly'] as const

export type RecurringFrequency = (typeof RECURRING_FREQUENCIES)[number]
