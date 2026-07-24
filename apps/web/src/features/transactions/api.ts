import type { CategoryType } from '@expense/shared'
import { api } from '@/lib/api'

export interface Transaction {
  id: string
  amount: number
  type: CategoryType
  wallet: { id: string; name: string }
  category: {
    id: string
    name: string
    type: CategoryType
    icon: string | null
    color: string | null
  }
  occurredOn: string
  note: string | null
}

export interface TransactionFilters {
  from?: string
  to?: string
  walletId?: string
  categoryId?: string
  type?: CategoryType
  minAmount?: number
  maxAmount?: number
  q?: string
  limit?: number
  cursor?: string
}

export interface TransactionInput {
  amount: number
  walletId: string
  categoryId: string
  occurredOn: string
  note?: string | null
}

export function listTransactions(filters: TransactionFilters) {
  return api.get<{ items: Transaction[]; nextCursor: string | null }>('/transactions', {
    ...filters,
  })
}

export function createTransaction(input: TransactionInput) {
  return api.post<Transaction>('/transactions', input)
}

export function updateTransaction(id: string, input: Partial<TransactionInput>) {
  return api.patch<Transaction>(`/transactions/${id}`, input)
}

export function deleteTransaction(id: string) {
  return api.delete<undefined>(`/transactions/${id}`)
}
