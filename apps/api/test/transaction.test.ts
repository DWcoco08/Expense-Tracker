import { SELF } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import { authedJsonRequest, registerUser } from './helpers'

// Hàm hỗ trợ tạo ví và danh mục trước khi test giao dịch
async function setupTestData(cookie: string) {
  // Tạo ví
  const walletRes = await SELF.fetch(
    authedJsonRequest(cookie, '/v1/wallets', {
      method: 'POST',
      body: { name: 'Ví giao dịch', initialBalance: 1_000_000 },
    }),
  )
  const wallet = (await walletRes.json()) as { id: string }

  // Lấy danh sách danh mục mặc định được tạo sẵn khi đăng ký
  const catRes = await SELF.fetch(
    authedJsonRequest(cookie, '/v1/categories', {
      method: 'GET',
    }),
  )
  const catBody = (await catRes.json()) as { items: { id: string; type: string }[] }
  const expenseCat = catBody.items.find((c) => c.type === 'expense')

  return { walletId: wallet.id, categoryId: expenseCat?.id ?? 'c-1' }
}

describe('Transactions Integration & Business Rules Testing', () => {
  it('TC_TX_001: Should create transaction successfully with valid date', async () => {
    const { cookie } = await registerUser()
    const { walletId, categoryId } = await setupTestData(cookie)

    const response = await SELF.fetch(
      authedJsonRequest(cookie, '/v1/transactions', {
        method: 'POST',
        body: {
          walletId,
          categoryId,
          amount: 50_000,
          occurredOn: '2026-08-20',
          note: 'Ăn trưa',
        },
      }),
    )

    expect(response.status).toBe(201)
    const tx = (await response.json()) as { amount: number }
    expect(tx.amount).toBe(50_000)
  })

  it('TC_TX_002: Should reject transaction with future date (FUTURE_DATE)', async () => {
    const { cookie } = await registerUser()
    const { walletId, categoryId } = await setupTestData(cookie)

    // Tính tương lai so với ngày chạy test thật (+3 ngày, an toàn qua mọi múi giờ),
    // không hardcode ngày cụ thể — hardcode từng khiến test này tự hết hạn khi đồng
    // hồ hệ thống đi tới ngày đó (đã xảy ra thật với '2026-08-26').
    const future = new Date()
    future.setUTCDate(future.getUTCDate() + 3)
    const futureDate = future.toISOString().slice(0, 10)

    const response = await SELF.fetch(
      authedJsonRequest(cookie, '/v1/transactions', {
        method: 'POST',
        body: {
          walletId,
          categoryId,
          amount: 50_000,
          occurredOn: futureDate,
          note: 'Tương lai',
        },
      }),
    )

    expect(response.status).toBe(400)
    const body = (await response.json()) as { error: { code: string } }
    expect(body.error.code).toBe('FUTURE_DATE')
  })

  it('TC_TX_004: Should return 404 when updating a non-existent transaction', async () => {
    const { cookie } = await registerUser()

    const response = await SELF.fetch(
      authedJsonRequest(cookie, '/v1/transactions/non-existent-id', {
        method: 'PATCH',
        body: {
          amount: 100_000,
        },
      }),
    )

    expect(response.status).toBe(404)
    const body = (await response.json()) as { error: { code: string } }
    expect(body.error.code).toBe('NOT_FOUND')
  })
})
