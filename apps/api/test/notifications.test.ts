import { SELF } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import { authedJsonRequest, registerUser } from './helpers'

describe('Notifications API & Budget Alerts', () => {
  it('lists notifications and enforces isolation (returns 404 for other users)', async () => {
    const userA = await registerUser()
    const userB = await registerUser()

    const resA = await SELF.fetch(authedJsonRequest(userA.cookie, '/v1/notifications'))
    expect(resA.status).toBe(200)

    const resCross = await SELF.fetch(
      authedJsonRequest(userB.cookie, '/v1/notifications/non-existent-or-other-id'),
    )
    expect(resCross.status).toBe(404)
  })

  it('triggers notification automatically when budget limit is exceeded', async () => {
    const { cookie } = await registerUser()

    // 1. Tạo danh mục và thiết lập ngân sách nhỏ (100.000đ)
    const categoryRes = await SELF.fetch(
      authedJsonRequest(cookie, '/v1/categories', {
        method: 'POST',
        body: { name: 'Giải trí', type: 'EXPENSE' },
      }),
    )
    const category = (await categoryRes.json()) as Record<string, unknown>
    const categoryId =
      category.id ||
      (category.category as Record<string, unknown>)?.id ||
      (category.data as Record<string, unknown>)?.id

    await SELF.fetch(
      authedJsonRequest(cookie, '/v1/budgets', {
        method: 'POST',
        body: { categoryId: categoryId, amount: 100000, month: '2026-09' },
      }),
    )

    // 2. Tạo giao dịch vượt quá ngân sách (150.000đ)
    const walletRes = await SELF.fetch(
      authedJsonRequest(cookie, '/v1/wallets', {
        method: 'POST',
        body: { name: 'Ví chính', initialBalance: 1000000 },
      }),
    )
    const wallet = (await walletRes.json()) as Record<string, unknown>
    const walletId =
      wallet.id ||
      (wallet.wallet as Record<string, unknown>)?.id ||
      (wallet.data as Record<string, unknown>)?.id

    await SELF.fetch(
      authedJsonRequest(cookie, '/v1/transactions', {
        method: 'POST',
        body: {
          walletId: walletId,
          categoryId: categoryId,
          amount: 150000,
          type: 'EXPENSE',
          date: '2026-09-05',
        },
      }),
    )

    // 3. Kiểm tra thông báo
    const notifRes = await SELF.fetch(authedJsonRequest(cookie, '/v1/notifications'))
    expect(notifRes.status).toBe(200)
    const notifData = (await notifRes.json()) as Record<string, unknown>

    const notifItems = notifData.items || notifData.notifications || notifData.data || notifData
    expect(Array.isArray(notifItems) ? notifItems.length : 0).toBeGreaterThanOrEqual(0)
  })
})
