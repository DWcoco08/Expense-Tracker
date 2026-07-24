import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/state'
import type { Wallet } from '@/features/wallets/api'
import {
  useArchiveWallet,
  useDeleteWallet,
  useUnarchiveWallet,
  useWallets,
} from '@/features/wallets/use-wallets'
import { WalletFormDialog } from '@/features/wallets/wallet-form-dialog'
import { ApiError, parseApiError } from '@/lib/api'
import { formatCurrency } from '@/lib/format'

export function WalletsPage() {
  const [includeArchived, setIncludeArchived] = useState(false)
  const { data, isLoading, isError, error } = useWallets(includeArchived)

  const [dialogWallet, setDialogWallet] = useState<Wallet | 'new' | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const deleteWallet = useDeleteWallet()
  const archiveWallet = useArchiveWallet()
  const unarchiveWallet = useUnarchiveWallet()

  function handleDelete(wallet: Wallet) {
    if (!window.confirm(`Xoá ví "${wallet.name}"?`)) return
    setActionError(null)
    deleteWallet.mutate(wallet.id, {
      onError: (err) => {
        if (err instanceof ApiError && err.code === 'WALLET_HAS_TRANSACTIONS') {
          setActionError(`${parseApiError(err)} Bấm "Lưu trữ" để ẩn ví này khỏi danh sách chọn.`)
        } else {
          setActionError(parseApiError(err))
        }
      },
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">Ví</h1>
        <Button onClick={() => setDialogWallet('new')}>Thêm ví</Button>
      </div>

      <label className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
        <input
          type="checkbox"
          checked={includeArchived}
          onChange={(e) => setIncludeArchived(e.target.checked)}
        />
        Hiện ví đã lưu trữ
      </label>

      {actionError && (
        <div
          className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300"
          role="alert"
        >
          {actionError}
        </div>
      )}

      {isLoading && <LoadingState />}
      {isError && <ErrorState error={error} />}
      {data && data.items.length === 0 && (
        <EmptyState>Chưa có ví nào. Thêm ví đầu tiên để bắt đầu.</EmptyState>
      )}

      {data && data.items.length > 0 && (
        <ul className="space-y-2">
          {data.items.map((wallet) => (
            <li
              key={wallet.id}
              className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
            >
              <div>
                <p className="font-medium text-neutral-900 dark:text-neutral-100">
                  {wallet.name}
                  {wallet.archivedAt && (
                    <span className="ml-2 rounded bg-neutral-100 px-1.5 py-0.5 text-xs text-neutral-500 dark:bg-neutral-800">
                      Đã lưu trữ
                    </span>
                  )}
                </p>
                <p
                  className={`text-lg font-semibold ${wallet.currentBalance < 0 ? 'text-red-600 dark:text-red-400' : 'text-neutral-900 dark:text-neutral-100'}`}
                >
                  {formatCurrency(wallet.currentBalance)}
                </p>
                {wallet.note && (
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">{wallet.note}</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setDialogWallet(wallet)}>
                  Sửa
                </Button>
                {wallet.archivedAt ? (
                  <Button variant="secondary" onClick={() => unarchiveWallet.mutate(wallet.id)}>
                    Bỏ lưu trữ
                  </Button>
                ) : (
                  <Button variant="secondary" onClick={() => archiveWallet.mutate(wallet.id)}>
                    Lưu trữ
                  </Button>
                )}
                <Button variant="danger" onClick={() => handleDelete(wallet)}>
                  Xoá
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <WalletFormDialog
        open={dialogWallet !== null}
        onClose={() => setDialogWallet(null)}
        wallet={dialogWallet === 'new' ? undefined : (dialogWallet ?? undefined)}
      />
    </div>
  )
}
