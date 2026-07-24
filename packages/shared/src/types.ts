export const CATEGORY_TYPES = ['income', 'expense'] as const

export type CategoryType = (typeof CATEGORY_TYPES)[number]
