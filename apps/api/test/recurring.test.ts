import { SELF } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import { authedJsonRequest, registerUser } from './helpers'

async function createWalletAndCategory(cookie: string, suffix: number) {
  const walletRes = await SELF.fetch(
    authedJsonRequest(cookie, '/v1/wallets', {
      method: 'POST',
      body: { name: `Ví ${suffix}`, initialBalance: 1_000_000 },
    }),
  )
  expect(walletRes.status).toBe(201)
  const { id: walletId } = (await walletRes.json()) as { id: string }

  const categoryRes = await SELF.fetch(
    authedJsonRequest(cookie, '/v1/categories', {
      method: 'POST',
      body: { name: `Tiền nhà ${suffix}`, type: 'expense' },
    }),
  )
  expect(categoryRes.status).toBe(201)
  const { id: categoryId } = (await categoryRes.json()) as { id: string }

  return { walletId, categoryId }
}

describe('Recurring Transactions API', () => {
  it('creates and lists recurring transactions successfully', async () => {
    const { cookie } = await registerUser()
    const { walletId, categoryId } = await createWalletAndCategory(cookie, Date.now())

    const createRes = await SELF.fetch(
      authedJsonRequest(cookie, '/v1/recurring', {
        method: 'POST',
        body: {
          walletId,
          categoryId,
          amount: 3_000_000,
          frequency: 'monthly',
          anchorDay: 1,
          startOn: '2026-09-01',
        },
      }),
    )

    expect(createRes.status).toBe(201)
    const recurring = (await createRes.json()) as { id: string; amount: number }
    expect(recurring.id).toBeDefined()
    expect(recurring.amount).toBe(3_000_000)

    const listRes = await SELF.fetch(authedJsonRequest(cookie, '/v1/recurring'))
    expect(listRes.status).toBe(200)
    const { items } = (await listRes.json()) as { items: unknown[] }
    expect(items.some((item) => (item as { id: string }).id === recurring.id)).toBe(true)
  })

  it("does not allow another user to update another user's recurring transaction", async () => {
    const userA = await registerUser()
    const userB = await registerUser()
    const { walletId, categoryId } = await createWalletAndCategory(userA.cookie, Date.now())

    const createRes = await SELF.fetch(
      authedJsonRequest(userA.cookie, '/v1/recurring', {
        method: 'POST',
        body: {
          walletId,
          categoryId,
          amount: 260_000,
          frequency: 'monthly',
          anchorDay: 1,
          startOn: '2026-09-01',
        },
      }),
    )
    expect(createRes.status).toBe(201)
    const { id: recurringId } = (await createRes.json()) as { id: string }

    const patchRes = await SELF.fetch(
      authedJsonRequest(userB.cookie, `/v1/recurring/${recurringId}`, {
        method: 'PATCH',
        body: { amount: 999_999 },
      }),
    )

    expect(patchRes.status).toBe(404)
  })
})
