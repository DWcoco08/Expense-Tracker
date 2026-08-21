import { SELF } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import { authedJsonRequest, registerUser } from './helpers'

describe('CSV Export API', () => {
  it('exports transactions to CSV successfully', async () => {
    const { cookie } = await registerUser()
    const uniqueSuffix = Date.now()

    // 1. Tạo ví và danh mục để có dữ liệu giao dịch xuất CSV
    const walletRes = await SELF.fetch(
      authedJsonRequest(cookie, '/v1/wallets', {
        method: 'POST',
        body: { name: `Ví CSV ${uniqueSuffix}`, initialBalance: 2000000 },
      }),
    )
    const wallet = (await walletRes.json()) as Record<string, unknown>
    const walletId =
      wallet.id ||
      (wallet.wallet as Record<string, unknown>)?.id ||
      (wallet.data as Record<string, unknown>)?.id

    const categoryRes = await SELF.fetch(
      authedJsonRequest(cookie, '/v1/categories', {
        method: 'POST',
        body: { name: `Ăn uống ${uniqueSuffix}`, type: 'EXPENSE' },
      }),
    )
    const category = (await categoryRes.json()) as Record<string, unknown>
    const categoryId =
      category.id ||
      (category.category as Record<string, unknown>)?.id ||
      (category.data as Record<string, unknown>)?.id

    // 2. Tạo một giao dịch mẫu
    await SELF.fetch(
      authedJsonRequest(cookie, '/v1/transactions', {
        method: 'POST',
        body: {
          walletId,
          categoryId,
          amount: 50000,
          type: 'EXPENSE',
          date: '2026-09-01',
        },
      }),
    )

    // 3. Gọi API xuất CSV theo đúng đường dẫn của module transactions
    const exportRes = await SELF.fetch(authedJsonRequest(cookie, '/v1/transactions/export'))
    expect(exportRes.status).toBe(200)

    const contentType = exportRes.headers.get('content-type') || ''
    expect(
      contentType.includes('text/csv') || contentType.includes('application/octet-stream'),
    ).toBe(true)

    const csvText = await exportRes.text()
    expect(typeof csvText).toBe('string')
  })
})
