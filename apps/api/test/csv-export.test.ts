import { SELF } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import { authedJsonRequest, registerUser } from './helpers'

describe('CSV Export API', () => {
  it('exports transactions to CSV successfully', async () => {
    const { cookie } = await registerUser()
    const uniqueSuffix = Date.now()

    const walletRes = await SELF.fetch(
      authedJsonRequest(cookie, '/v1/wallets', {
        method: 'POST',
        body: { name: `Ví CSV ${uniqueSuffix}`, initialBalance: 2_000_000 },
      }),
    )
    expect(walletRes.status).toBe(201)
    const { id: walletId } = (await walletRes.json()) as { id: string }

    const categoryRes = await SELF.fetch(
      authedJsonRequest(cookie, '/v1/categories', {
        method: 'POST',
        body: { name: `Ăn uống ${uniqueSuffix}`, type: 'expense' },
      }),
    )
    expect(categoryRes.status).toBe(201)
    const { id: categoryId } = (await categoryRes.json()) as { id: string }

    const transactionRes = await SELF.fetch(
      authedJsonRequest(cookie, '/v1/transactions', {
        method: 'POST',
        body: { walletId, categoryId, amount: 50_000, occurredOn: '2020-01-15' },
      }),
    )
    expect(transactionRes.status).toBe(201)

    const exportRes = await SELF.fetch(authedJsonRequest(cookie, '/v1/transactions/export'))

    expect(exportRes.status).toBe(200)
    expect(exportRes.headers.get('content-type')).toContain('text/csv')

    const csvText = await exportRes.text()
    expect(csvText).toContain('50000')
  })
})
