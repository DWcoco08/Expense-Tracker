import { SELF } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import { authedJsonRequest, registerUser } from './helpers'

type ResourceId = { id: string }
type Category = ResourceId & { type: 'income' | 'expense' }
type Transaction = ResourceId & {
  amount: number
  type: 'income' | 'expense'
  occurredOn: string
  note: string | null
}
type TransactionList = { items: Transaction[]; nextCursor: string | null }
type StatsOverview = {
  from: string
  to: string
  monthly: { month: string; income: number; expense: number }[]
  totalTransactions: number
}

async function createWallet(cookie: string, name: string): Promise<ResourceId> {
  const response = await SELF.fetch(
    authedJsonRequest(cookie, '/v1/wallets', {
      method: 'POST',
      body: { name, initialBalance: 0 },
    }),
  )
  expect(response.status).toBe(201)
  return (await response.json()) as ResourceId
}

async function createCategory(
  cookie: string,
  name: string,
  type: 'income' | 'expense',
): Promise<Category> {
  const response = await SELF.fetch(
    authedJsonRequest(cookie, '/v1/categories', {
      method: 'POST',
      body: { name, type },
    }),
  )
  expect(response.status).toBe(201)
  return (await response.json()) as Category
}

async function createTransaction(
  cookie: string,
  walletId: string,
  categoryId: string,
  input: { amount: number; occurredOn: string; note?: string; type?: string },
): Promise<Transaction> {
  const response = await SELF.fetch(
    authedJsonRequest(cookie, '/v1/transactions', {
      method: 'POST',
      body: { walletId, categoryId, ...input },
    }),
  )
  expect(response.status).toBe(201)
  return (await response.json()) as Transaction
}

describe('FR-09 to FR-12 transactions', () => {
  it('supports create, get, patch, delete, derives type, and isolates accounts', async () => {
    const owner = await registerUser()
    const other = await registerUser()
    const wallet = await createWallet(owner.cookie, `transaction-wallet-${Date.now()}`)
    const expense = await createCategory(owner.cookie, `expense-${Date.now()}`, 'expense')

    const transaction = await createTransaction(owner.cookie, wallet.id, expense.id, {
      amount: 125_000,
      occurredOn: '2026-08-20',
      note: 'Original note',
      type: 'income',
    })
    expect(transaction.type).toBe('expense')

    const getResponse = await SELF.fetch(
      authedJsonRequest(owner.cookie, `/v1/transactions/${transaction.id}`),
    )
    expect(getResponse.status).toBe(200)

    const patchResponse = await SELF.fetch(
      authedJsonRequest(owner.cookie, `/v1/transactions/${transaction.id}`, {
        method: 'PATCH',
        body: { amount: 150_000, note: 'Updated note' },
      }),
    )
    expect(patchResponse.status).toBe(200)
    expect(((await patchResponse.json()) as Transaction).amount).toBe(150_000)

    const otherGetResponse = await SELF.fetch(
      authedJsonRequest(other.cookie, `/v1/transactions/${transaction.id}`),
    )
    expect(otherGetResponse.status).toBe(404)

    const otherDeleteResponse = await SELF.fetch(
      authedJsonRequest(other.cookie, `/v1/transactions/${transaction.id}`, { method: 'DELETE' }),
    )
    expect(otherDeleteResponse.status).toBe(404)

    const deleteResponse = await SELF.fetch(
      authedJsonRequest(owner.cookie, `/v1/transactions/${transaction.id}`, { method: 'DELETE' }),
    )
    expect(deleteResponse.status).toBe(204)
  })

  // 101 lần tạo giao dịch tuần tự qua HTTP thật (D1 thật) vượt quá 5s mặc định của
  // Vitest tuỳ tải máy — cần timeout riêng, không phải lỗi nghiệp vụ.
  it('filters and searches transactions and caps limit above 100', async () => {
    const { cookie } = await registerUser()
    const wallet = await createWallet(cookie, `filter-wallet-${Date.now()}`)
    const expense = await createCategory(cookie, `filter-expense-${Date.now()}`, 'expense')
    const income = await createCategory(cookie, `filter-income-${Date.now()}`, 'income')

    await createTransaction(cookie, wallet.id, expense.id, {
      amount: 500,
      occurredOn: '2026-08-10',
      note: 'grocery search marker',
    })
    await createTransaction(cookie, wallet.id, income.id, {
      amount: 2_000,
      occurredOn: '2026-08-11',
      note: 'salary marker',
    })

    const filteredResponse = await SELF.fetch(
      authedJsonRequest(
        cookie,
        `/v1/transactions?type=expense&minAmount=400&maxAmount=600&q=grocery&from=2026-08-01&to=2026-08-31`,
      ),
    )
    expect(filteredResponse.status).toBe(200)
    const filtered = (await filteredResponse.json()) as TransactionList
    expect(filtered.items).toHaveLength(1)
    expect(filtered.items[0]?.note).toBe('grocery search marker')

    for (let index = 0; index < 101; index += 1) {
      await createTransaction(cookie, wallet.id, expense.id, {
        amount: index + 1,
        occurredOn: '2026-07-01',
        note: `page-${index}`,
      })
    }

    const firstPageResponse = await SELF.fetch(
      authedJsonRequest(cookie, '/v1/transactions?limit=101&to=2026-07-01'),
    )
    const firstPage = (await firstPageResponse.json()) as TransactionList
    expect(firstPage.items).toHaveLength(100)
    expect(firstPage.nextCursor).toEqual(expect.any(String))

    const secondPageResponse = await SELF.fetch(
      authedJsonRequest(
        cookie,
        `/v1/transactions?limit=100&to=2026-07-01&cursor=${encodeURIComponent(firstPage.nextCursor ?? '')}`,
      ),
    )
    const secondPage = (await secondPageResponse.json()) as TransactionList
    expect(secondPage.items).toHaveLength(1)
    expect(secondPage.items[0]?.id).not.toBe(firstPage.items[0]?.id)
  }, 30_000)
})

describe('FR-13 to FR-14 statistics', () => {
  it('returns dashboard totals and a 24-month overview for the account', async () => {
    const { cookie } = await registerUser()
    const wallet = await createWallet(cookie, `stats-wallet-${Date.now()}`)
    const income = await createCategory(cookie, `stats-income-${Date.now()}`, 'income')
    const expense = await createCategory(cookie, `stats-expense-${Date.now()}`, 'expense')

    await createTransaction(cookie, wallet.id, income.id, {
      amount: 10_000,
      occurredOn: '2026-08-05',
    })
    await createTransaction(cookie, wallet.id, expense.id, {
      amount: 3_000,
      occurredOn: '2026-08-10',
    })

    const dashboardResponse = await SELF.fetch(
      authedJsonRequest(cookie, '/v1/stats/dashboard?month=2026-08'),
    )
    expect(dashboardResponse.status).toBe(200)
    const dashboard = (await dashboardResponse.json()) as {
      month: string
      totalIncome: number
      totalExpense: number
      net: number
    }
    expect(dashboard).toMatchObject({
      month: '2026-08',
      totalIncome: 10_000,
      totalExpense: 3_000,
      net: 7_000,
    })

    const overviewResponse = await SELF.fetch(
      authedJsonRequest(cookie, '/v1/stats/overview?from=2024-09&to=2026-08'),
    )
    expect(overviewResponse.status).toBe(200)
    const overview = (await overviewResponse.json()) as StatsOverview
    expect(overview.monthly).toHaveLength(24)
    expect(overview.totalTransactions).toBe(2)

    const tooLongResponse = await SELF.fetch(
      authedJsonRequest(cookie, '/v1/stats/overview?from=2024-08&to=2026-08'),
    )
    expect(tooLongResponse.status).toBe(400)
    expect(((await tooLongResponse.json()) as { error: { code: string } }).error.code).toBe(
      'VALIDATION',
    )
  })
})
