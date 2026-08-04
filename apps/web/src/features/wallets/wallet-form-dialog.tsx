import { Save } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Field, Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { parseApiError } from '@/lib/api'
import type { Wallet } from './api'
import { useCreateWallet, useUpdateWallet } from './use-wallets'

interface WalletFormDialogProps {
  open: boolean
  onClose: () => void
  wallet?: Wallet
}

export function WalletFormDialog({ open, onClose, wallet }: WalletFormDialogProps) {
  const isEdit = Boolean(wallet)
  const [name, setName] = useState(wallet?.name ?? '')
  const [initialBalance, setInitialBalance] = useState(String(wallet?.initialBalance ?? 0))
  const [note, setNote] = useState(wallet?.note ?? '')

  const create = useCreateWallet()
  const update = useUpdateWallet()
  const pending = create.isPending || update.isPending
  const error = create.error ?? update.error
  const { showToast } = useToast()

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const payload = {
      name,
      initialBalance: Number(initialBalance),
      note: note || null,
    }

    if (isEdit && wallet) {
      update.mutate(
        { id: wallet.id, input: payload },
        {
          onSuccess: () => {
            onClose()
            showToast('Đã lưu')
          },
        },
      )
    } else {
      create.mutate(payload, {
        onSuccess: () => {
          onClose()
          setName('')
          setInitialBalance('0')
          setNote('')
          showToast('Đã lưu')
        },
      })
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={isEdit ? 'Sửa ví' : 'Thêm ví'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Tên ví" htmlFor="wallet-name">
          <Input id="wallet-name" required value={name} onChange={(e) => setName(e.target.value)} />
        </Field>

        <Field label="Số dư ban đầu" htmlFor="wallet-initial-balance">
          <Input
            id="wallet-initial-balance"
            type="number"
            min={0}
            step={1}
            required
            disabled={isEdit}
            value={initialBalance}
            onChange={(e) => setInitialBalance(e.target.value)}
          />
        </Field>

        <Field label="Ghi chú" htmlFor="wallet-note">
          <Input id="wallet-note" value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>

        {error && (
          <p className="text-sm text-status-danger-text" role="alert">
            {parseApiError(error)}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Huỷ
          </Button>
          <Button type="submit" disabled={pending}>
            <Save className="h-4 w-4" />
            {pending ? 'Đang lưu…' : 'Lưu'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
