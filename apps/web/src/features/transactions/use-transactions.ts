import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as transactionsApi from './api'

const TRANSACTIONS_KEY = ['transactions']

export function useTransactions(filters: Omit<transactionsApi.TransactionFilters, 'cursor'>) {
  return useInfiniteQuery({
    queryKey: [...TRANSACTIONS_KEY, filters],
    queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
      transactionsApi.listTransactions({ ...filters, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  })
}

// Giao dịch thay đổi kéo theo số dư ví và số liệu thống kê — làm mới cả hai.
function useInvalidateTransactions() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: TRANSACTIONS_KEY })
    queryClient.invalidateQueries({ queryKey: ['wallets'] })
    queryClient.invalidateQueries({ queryKey: ['stats'] })
  }
}

export function useCreateTransaction() {
  const invalidate = useInvalidateTransactions()
  return useMutation({ mutationFn: transactionsApi.createTransaction, onSuccess: invalidate })
}

export function useUpdateTransaction() {
  const invalidate = useInvalidateTransactions()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<transactionsApi.TransactionInput> }) =>
      transactionsApi.updateTransaction(id, input),
    onSuccess: invalidate,
  })
}

export function useDeleteTransaction() {
  const invalidate = useInvalidateTransactions()
  return useMutation({ mutationFn: transactionsApi.deleteTransaction, onSuccess: invalidate })
}
