import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as walletsApi from './api'

const WALLETS_KEY = ['wallets']

export function useWallets(includeArchived: boolean) {
  return useQuery({
    queryKey: [...WALLETS_KEY, { includeArchived }],
    queryFn: () => walletsApi.listWallets(includeArchived),
  })
}

function useInvalidateWallets() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: WALLETS_KEY })
}

export function useCreateWallet() {
  const invalidate = useInvalidateWallets()
  return useMutation({ mutationFn: walletsApi.createWallet, onSuccess: invalidate })
}

export function useUpdateWallet() {
  const invalidate = useInvalidateWallets()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: walletsApi.WalletInput }) =>
      walletsApi.updateWallet(id, input),
    onSuccess: invalidate,
  })
}

export function useDeleteWallet() {
  const invalidate = useInvalidateWallets()
  return useMutation({ mutationFn: walletsApi.deleteWallet, onSuccess: invalidate })
}

export function useArchiveWallet() {
  const invalidate = useInvalidateWallets()
  return useMutation({ mutationFn: walletsApi.archiveWallet, onSuccess: invalidate })
}

export function useUnarchiveWallet() {
  const invalidate = useInvalidateWallets()
  return useMutation({ mutationFn: walletsApi.unarchiveWallet, onSuccess: invalidate })
}
