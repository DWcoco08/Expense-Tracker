import { api } from '@/lib/api'

export interface Wallet {
  id: string
  name: string
  initialBalance: number
  currentBalance: number
  totalIncome: number
  totalExpense: number
  currency: string
  note: string | null
  archivedAt: number | null
}

export interface WalletInput {
  name?: string
  initialBalance?: number
  note?: string | null
}

export function listWallets(includeArchived: boolean) {
  return api.get<{ items: Wallet[]; nextCursor: string | null }>('/wallets', { includeArchived })
}

export function createWallet(
  input: Required<Pick<WalletInput, 'name' | 'initialBalance'>> & WalletInput,
) {
  return api.post<Wallet>('/wallets', input)
}

export function updateWallet(id: string, input: WalletInput) {
  return api.patch<Wallet>(`/wallets/${id}`, input)
}

export function deleteWallet(id: string) {
  return api.delete<undefined>(`/wallets/${id}`)
}

export function archiveWallet(id: string) {
  return api.post<Wallet>(`/wallets/${id}/archive`)
}

export function unarchiveWallet(id: string) {
  return api.post<Wallet>(`/wallets/${id}/unarchive`)
}
