import { api } from '@/lib/api'

export type RecurringFrequency = 'daily' | 'weekly' | 'monthly'

export interface RecurringTransaction {
  id: string
  walletId: string
  categoryId: string
  amount: number
  note: string | null
  frequency: RecurringFrequency
  anchorDay: number | null
  startOn: string
  endOn: string | null
  nextRunOn: string
  archivedAt: number | null
}

export interface CreateRecurringInput {
  walletId: string
  categoryId: string
  amount: number
  note?: string | null
  frequency: RecurringFrequency
  anchorDay?: number | null
  startOn: string
  endOn?: string | null
}

export interface UpdateRecurringInput {
  amount?: number
  note?: string | null
  endOn?: string | null
}

export function listRecurring() {
  return api.get<{ items: RecurringTransaction[] }>('/recurring')
}

export function createRecurring(input: CreateRecurringInput) {
  return api.post<RecurringTransaction>('/recurring', input)
}

export function updateRecurring(id: string, input: UpdateRecurringInput) {
  return api.patch<RecurringTransaction>(`/recurring/${id}`, input)
}

export function deleteRecurring(id: string) {
  return api.delete<undefined>(`/recurring/${id}`)
}

export function archiveRecurring(id: string) {
  return api.post<RecurringTransaction>(`/recurring/${id}/archive`)
}

export function unarchiveRecurring(id: string) {
  return api.post<RecurringTransaction>(`/recurring/${id}/unarchive`)
}
