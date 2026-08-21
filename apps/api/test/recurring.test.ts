import { SELF } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import { authedJsonRequest, registerUser } from './helpers'

interface GenericResponse {
  id?: string
  amount?: number
  recurring?: GenericResponse
  data?: GenericResponse
  items?: GenericResponse[]
  wallet?: { id?: string }
  category?: { id?: string }
  [key: string]: unknown
}

describe('Recurring Transactions API', () => {
  it('creates and lists recurring transactions successfully', async () => {
    const { cookie } = await registerUser()
    const uniqueSuffix = Date.now()

    // 1. Tạo ví và danh mục
    const walletRes = await SELF.fetch(
      authedJsonRequest(cookie, '/v1/wallets', {
        method: 'POST',
        body: { name: `Ví chính ${uniqueSuffix}`, initialBalance: 1000000 },
      }),
    )
    const walletData = (await walletRes.json()) as GenericResponse
    const walletId = walletData.id || walletData.wallet?.id || walletData.data?.id

    const categoryRes = await SELF.fetch(
      authedJsonRequest(cookie, '/v1/categories', {
        method: 'POST',
        body: { name: `Tiền nhà ${uniqueSuffix}`, type: 'expense' },
      }),
    )
    const categoryData = (await categoryRes.json()) as GenericResponse
    const categoryId = categoryData.id || categoryData.category?.id || categoryData.data?.id

    // 2. Tạo recurring transaction
    const createRes = await SELF.fetch(
      authedJsonRequest(cookie, '/v1/recurring', {
        method: 'POST',
        body: {
          walletId,
          categoryId,
          name: 'Thuê nhà',
          amount: 3000000,
          type: 'expense',
          frequency: 'monthly',
          anchorDay: 1,
          startOn: '2026-09-01',
        },
      }),
    )

    expect(createRes.status).toBe(201)
    const createData = (await createRes.json()) as GenericResponse
    const recurring = (createData.recurring || createData.data || createData) as GenericResponse

    // Kiểm tra các trường thực tế có trong response để không dùng 'any'
    expect(recurring.id).toBeDefined()
    expect(recurring.amount).toBe(3000000)

    // Liệt kê danh sách recurring
    const listRes = await SELF.fetch(authedJsonRequest(cookie, '/v1/recurring'))
    expect(listRes.status).toBe(200)
    const listData = (await listRes.json()) as GenericResponse
    const items = (listData.items ||
      listData.recurring ||
      listData.data ||
      listData) as GenericResponse[]
    expect(Array.isArray(items) ? items.length : 0).toBeGreaterThan(0)
  })

  it("returns 404 when user tries to access another user's recurring transaction", async () => {
    const userA = await registerUser()
    const userB = await registerUser()
    const uniqueSuffix = Date.now()

    const walletRes = await SELF.fetch(
      authedJsonRequest(userA.cookie, '/v1/wallets', {
        method: 'POST',
        body: { name: `Ví A ${uniqueSuffix}`, initialBalance: 1000000 },
      }),
    )
    const walletData = (await walletRes.json()) as GenericResponse
    const walletId = walletData.id || walletData.wallet?.id || walletData.data?.id

    const categoryRes = await SELF.fetch(
      authedJsonRequest(userA.cookie, '/v1/categories', {
        method: 'POST',
        body: { name: `Ăn uống ${uniqueSuffix}`, type: 'expense' },
      }),
    )
    const categoryData = (await categoryRes.json()) as GenericResponse
    const categoryId = categoryData.id || categoryData.category?.id || categoryData.data?.id

    const createRes = await SELF.fetch(
      authedJsonRequest(userA.cookie, '/v1/recurring', {
        method: 'POST',
        body: {
          walletId,
          categoryId,
          name: 'Netflix',
          amount: 260000,
          type: 'expense',
          frequency: 'monthly',
          anchorDay: 1,
          startOn: '2026-09-01',
        },
      }),
    )
    const createData = (await createRes.json()) as GenericResponse
    const recurring = (createData.recurring || createData.data || createData) as GenericResponse
    const recurringId = recurring.id || recurring.recurring?.id

    const accessRes = await SELF.fetch(
      authedJsonRequest(userB.cookie, `/v1/recurring/${recurringId}`),
    )
    expect(accessRes.status).toBe(404)
  })
})
