import { SELF } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import { authedJsonRequest, registerUser } from './helpers'

async function triggerBudgetExceededNotification(cookie: string) {
  const categoryRes = await SELF.fetch(
    authedJsonRequest(cookie, '/v1/categories', {
      method: 'POST',
      body: { name: `Giải trí ${Date.now()}`, type: 'expense' },
    }),
  )
  expect(categoryRes.status).toBe(201)
  const { id: categoryId } = (await categoryRes.json()) as { id: string }

  const budgetRes = await SELF.fetch(
    authedJsonRequest(cookie, '/v1/budgets', {
      method: 'POST',
      body: { categoryId, amountLimit: 100_000, month: '2020-01' },
    }),
  )
  expect(budgetRes.status).toBe(201)

  const walletRes = await SELF.fetch(
    authedJsonRequest(cookie, '/v1/wallets', {
      method: 'POST',
      body: { name: `Ví chính ${Date.now()}`, initialBalance: 1_000_000 },
    }),
  )
  expect(walletRes.status).toBe(201)
  const { id: walletId } = (await walletRes.json()) as { id: string }

  // Vượt ngân sách 100.000đ ngay ở giao dịch đầu tiên (0 -> 150.000). Ngày cố định
  // trong quá khứ (không phải ngày tương lai) để không bị chặn bởi FUTURE_DATE khi
  // chạy test ở bất kỳ thời điểm nào, và cùng tháng với budget ở trên (2020-01).
  const transactionRes = await SELF.fetch(
    authedJsonRequest(cookie, '/v1/transactions', {
      method: 'POST',
      body: { walletId, categoryId, amount: 150_000, occurredOn: '2020-01-15' },
    }),
  )
  expect(transactionRes.status).toBe(201)
}

describe('Notifications API & Budget Alerts', () => {
  it('triggers a budget_exceeded notification once spending crosses the limit', async () => {
    const { cookie } = await registerUser()

    await triggerBudgetExceededNotification(cookie)

    const notifRes = await SELF.fetch(authedJsonRequest(cookie, '/v1/notifications'))
    expect(notifRes.status).toBe(200)

    const { items } = (await notifRes.json()) as {
      items: { id: string; type: string; message: string }[]
    }

    expect(items.some((item) => item.type === 'budget_exceeded')).toBe(true)
  })

  it('does not allow another user to mark someone else’s notification as read', async () => {
    const owner = await registerUser()
    const intruder = await registerUser()

    await triggerBudgetExceededNotification(owner.cookie)

    const listRes = await SELF.fetch(authedJsonRequest(owner.cookie, '/v1/notifications'))
    const { items } = (await listRes.json()) as { items: { id: string }[] }
    const notificationId = items[0]?.id
    expect(notificationId).toBeDefined()

    const readRes = await SELF.fetch(
      authedJsonRequest(intruder.cookie, `/v1/notifications/${notificationId}/read`, {
        method: 'POST',
      }),
    )

    expect(readRes.status).toBe(404)
  })
})
