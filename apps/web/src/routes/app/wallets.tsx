import { Archive, ArchiveRestore, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/state'
import { Table, TBody, Td, THead, Th } from '@/components/ui/table'
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
  const [deleteTarget, setDeleteTarget] = useState<Wallet | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const deleteWallet = useDeleteWallet()
  const archiveWallet = useArchiveWallet()
  const unarchiveWallet = useUnarchiveWallet()

  function handleDelete() {
    if (!deleteTarget) return
    setActionError(null)
    deleteWallet.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
      onError: (err) => {
        if (err instanceof ApiError && err.code === 'WALLET_HAS_TRANSACTIONS') {
          setActionError(`${parseApiError(err)} Bấm "Lưu trữ" để ẩn ví này khỏi danh sách chọn.`)
        } else {
          setActionError(parseApiError(err))
        }
        setDeleteTarget(null)
      },
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Ví</h1>
        <Button onClick={() => setDialogWallet('new')}>
          <Plus className="h-4 w-4" />
          Thêm ví
        </Button>
      </div>

      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <input
          type="checkbox"
          checked={includeArchived}
          onChange={(e) => setIncludeArchived(e.target.checked)}
        />
        Hiện ví đã lưu trữ
      </label>

      {actionError && (
        <div
          className="rounded-md border border-status-danger-text/30 bg-status-danger-surface px-3 py-2 text-sm text-status-danger-text"
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
        <Table>
          <THead>
            <tr>
              <Th>Ví</Th>
              <Th>Số dư</Th>
              <Th>Ghi chú</Th>
              <Th className="text-right">Thao tác</Th>
            </tr>
          </THead>
          <TBody>
            {data.items.map((wallet) => (
              <tr key={wallet.id}>
                <Td>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{wallet.name}</span>
                    {wallet.archivedAt && <Badge>Đã lưu trữ</Badge>}
                  </div>
                </Td>
                <Td>
                  <span
                    className={
                      wallet.currentBalance < 0
                        ? 'font-medium text-status-danger-text'
                        : 'font-medium text-foreground'
                    }
                  >
                    {formatCurrency(wallet.currentBalance)}
                  </span>
                </Td>
                <Td className="text-muted-foreground">{wallet.note ?? '—'}</Td>
                <Td>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => setDialogWallet(wallet)}>
                      <Pencil className="h-3.5 w-3.5" />
                      Sửa
                    </Button>
                    {wallet.archivedAt ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => unarchiveWallet.mutate(wallet.id)}
                      >
                        <ArchiveRestore className="h-3.5 w-3.5" />
                        Bỏ lưu trữ
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => archiveWallet.mutate(wallet.id)}
                      >
                        <Archive className="h-3.5 w-3.5" />
                        Lưu trữ
                      </Button>
                    )}
                    <Button variant="destructive" size="sm" onClick={() => setDeleteTarget(wallet)}>
                      <Trash2 className="h-3.5 w-3.5" />
                      Xoá
                    </Button>
                  </div>
                </Td>
              </tr>
            ))}
          </TBody>
        </Table>
      )}

      <WalletFormDialog
        open={dialogWallet !== null}
        onClose={() => setDialogWallet(null)}
        wallet={dialogWallet === 'new' ? undefined : (dialogWallet ?? undefined)}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Xoá ví"
        description={`Xoá ví "${deleteTarget?.name}"? Hành động này không thể hoàn tác.`}
        pending={deleteWallet.isPending}
      />
    </div>
  )
}
