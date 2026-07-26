import type { CategoryType, ErrorCode } from '@expense/shared'
import { ApiError, api, buildUrl } from '@/lib/api'

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

// Không dùng lớp bọc api.get() vì phản hồi là text/csv, không phải JSON.
export async function downloadTransactionsCsv(filters: TransactionFilters): Promise<void> {
  const response = await fetch(buildUrl('/transactions/export', { ...filters }), {
    credentials: 'include',
  })

  if (!response.ok) {
    const body: { error?: { code?: string; message?: string } } = await response
      .json()
      .catch(() => ({}))
    throw new ApiError(
      (body.error?.code as ErrorCode | undefined) ?? 'INTERNAL',
      body.error?.message ?? 'unknown_error',
    )
  }

  const blob = await response.blob()
  const blobUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = blobUrl
  link.download = 'transactions.csv'
  link.click()
  URL.revokeObjectURL(blobUrl)
}
