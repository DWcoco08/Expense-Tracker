import { SELF } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import { authedJsonRequest, registerUser } from './helpers'

type CategoryType = 'income' | 'expense'

async function createCategory(
  cookie: string,
  overrides: Partial<{
    name: string
    type: CategoryType
    icon: string | null
    color: string | null
  }> = {},
) {
  return SELF.fetch(
    authedJsonRequest(cookie, '/v1/categories', {
      method: 'POST',
      body: {
        name: overrides.name ?? `Category-${crypto.randomUUID()}`,
        type: overrides.type ?? 'expense',
        icon: overrides.icon ?? null,
        color: overrides.color ?? null,
      },
    }),
  )
}

async function getId(response: Response) {
  const body = (await response.json()) as { id: string }
  return body.id
}

async function createBudget(
  cookie: string,
  categoryId: string,
  overrides: Partial<{
    month: string
    amountLimit: number
  }> = {},
) {
  return SELF.fetch(
    authedJsonRequest(cookie, '/v1/budgets', {
      method: 'POST',
      body: {
        categoryId,
        month: overrides.month ?? '2026-08',
        amountLimit: overrides.amountLimit ?? 1_000_000,
      },
    }),
  )
}

async function createWallet(cookie: string) {
  return SELF.fetch(
    authedJsonRequest(cookie, '/v1/wallets', {
      method: 'POST',
      body: {
        name: `Wallet-${crypto.randomUUID()}`,
        initialBalance: 1_000_000,
      },
    }),
  )
}

async function createTransaction(
  cookie: string,
  walletId: string,
  categoryId: string,
  amount = 200_000,
) {
  return SELF.fetch(
    authedJsonRequest(cookie, '/v1/transactions', {
      method: 'POST',
      body: {
        amount,
        walletId,
        categoryId,
        occurredOn: '2026-08-20',
        note: 'Budget test transaction',
      },
    }),
  )
}

describe('Budget CRUD', () => {
  it('creates a budget for an expense category', async () => {
    const { cookie } = await registerUser()

    const categoryResponse = await createCategory(cookie, {
      name: `Food-${crypto.randomUUID()}`,
      type: 'expense',
    })

    expect(categoryResponse.status).toBe(201)

    const categoryId = await getId(categoryResponse)

    const response = await createBudget(cookie, categoryId, {
      month: '2026-08',
      amountLimit: 2_000_000,
    })

    expect(response.status).toBe(201)

    const budget = (await response.json()) as {
      id: string
      categoryId: string
      month: string
      amountLimit: number
    }

    expect(budget.id).toBeTruthy()
    expect(budget.categoryId).toBe(categoryId)
    expect(budget.month).toBe('2026-08')
    expect(budget.amountLimit).toBe(2_000_000)
  })

  it('lists budgets by month', async () => {
    const { cookie } = await registerUser()

    const categoryResponse = await createCategory(cookie, {
      name: `List-${crypto.randomUUID()}`,
      type: 'expense',
    })

    expect(categoryResponse.status).toBe(201)

    const categoryId = await getId(categoryResponse)

    const budgetResponse = await createBudget(cookie, categoryId, {
      month: '2026-08',
      amountLimit: 1_000_000,
    })

    expect(budgetResponse.status).toBe(201)

    const response = await SELF.fetch(
      authedJsonRequest(cookie, '/v1/budgets?month=2026-08', {
        method: 'GET',
      }),
    )

    expect(response.status).toBe(200)

    const body = (await response.json()) as {
      items: Array<{
        id: string
        categoryId: string
        month: string
        amountLimit: number
        spent: number
      }>
    }

    expect(Array.isArray(body.items)).toBe(true)

    const budget = body.items.find((item) => item.categoryId === categoryId)

    expect(budget).toBeDefined()
    expect(budget?.month).toBe('2026-08')
    expect(budget?.amountLimit).toBe(1_000_000)
    expect(budget?.spent).toBe(0)
  })

  it('updates a budget', async () => {
    const { cookie } = await registerUser()

    const categoryResponse = await createCategory(cookie, {
      name: `Update-${crypto.randomUUID()}`,
      type: 'expense',
    })

    expect(categoryResponse.status).toBe(201)

    const categoryId = await getId(categoryResponse)

    const created = await createBudget(cookie, categoryId, {
      month: '2026-08',
      amountLimit: 1_000_000,
    })

    expect(created.status).toBe(201)

    const budgetId = await getId(created)

    const response = await SELF.fetch(
      authedJsonRequest(cookie, `/v1/budgets/${budgetId}`, {
        method: 'PATCH',
        body: {
          amountLimit: 2_500_000,
        },
      }),
    )

    expect(response.status).toBe(200)

    const budget = (await response.json()) as {
      id: string
      categoryId: string
      month: string
      amountLimit: number
    }

    expect(budget.id).toBe(budgetId)
    expect(budget.categoryId).toBe(categoryId)
    expect(budget.month).toBe('2026-08')
    expect(budget.amountLimit).toBe(2_500_000)
  })

  it('deletes a budget', async () => {
    const { cookie } = await registerUser()

    const categoryResponse = await createCategory(cookie, {
      name: `Delete-${crypto.randomUUID()}`,
      type: 'expense',
    })

    expect(categoryResponse.status).toBe(201)

    const categoryId = await getId(categoryResponse)

    const created = await createBudget(cookie, categoryId)

    expect(created.status).toBe(201)

    const budgetId = await getId(created)

    const response = await SELF.fetch(
      authedJsonRequest(cookie, `/v1/budgets/${budgetId}`, {
        method: 'DELETE',
      }),
    )

    expect(response.status).toBe(204)

    const listResponse = await SELF.fetch(
      authedJsonRequest(cookie, '/v1/budgets?month=2026-08', {
        method: 'GET',
      }),
    )

    expect(listResponse.status).toBe(200)

    const body = (await listResponse.json()) as {
      items: Array<{ id: string }>
    }

    expect(body.items.some((item) => item.id === budgetId)).toBe(false)
  })
})

describe('Budget business rules', () => {
  it('rejects duplicate budget for the same category and month', async () => {
    const { cookie } = await registerUser()

    const categoryResponse = await createCategory(cookie, {
      name: `Duplicate-${crypto.randomUUID()}`,
      type: 'expense',
    })

    expect(categoryResponse.status).toBe(201)

    const categoryId = await getId(categoryResponse)

    const first = await createBudget(cookie, categoryId, {
      month: '2026-08',
      amountLimit: 1_000_000,
    })

    expect(first.status).toBe(201)

    const response = await createBudget(cookie, categoryId, {
      month: '2026-08',
      amountLimit: 2_000_000,
    })

    expect(response.status).toBe(409)

    const body = (await response.json()) as {
      error: { code: string }
    }

    expect(body.error.code).toBe('BUDGET_EXISTS')
  })

  it('allows budgets for the same category in different months', async () => {
    const { cookie } = await registerUser()

    const categoryResponse = await createCategory(cookie, {
      name: `DiffMonth-${crypto.randomUUID()}`,
      type: 'expense',
    })

    expect(categoryResponse.status).toBe(201)

    const categoryId = await getId(categoryResponse)

    const august = await createBudget(cookie, categoryId, {
      month: '2026-08',
      amountLimit: 1_000_000,
    })

    const september = await createBudget(cookie, categoryId, {
      month: '2026-09',
      amountLimit: 1_500_000,
    })

    expect(august.status).toBe(201)
    expect(september.status).toBe(201)
  })

  it('rejects a budget for an income category', async () => {
    const { cookie } = await registerUser()

    const categoryResponse = await createCategory(cookie, {
      name: `Income-${crypto.randomUUID()}`,
      type: 'income',
    })

    expect(categoryResponse.status).toBe(201)

    const categoryId = await getId(categoryResponse)

    const response = await createBudget(cookie, categoryId, {
      month: '2026-08',
      amountLimit: 1_000_000,
    })

    expect(response.status).toBe(400)

    const body = (await response.json()) as {
      error: { code: string }
    }

    expect(body.error.code).toBe('BUDGET_CATEGORY_TYPE_INVALID')
  })
})

describe('Budget security', () => {
  it('does not expose another user budget', async () => {
    const owner = await registerUser()
    const intruder = await registerUser()

    const categoryResponse = await createCategory(owner.cookie, {
      name: `Private-${crypto.randomUUID()}`,
      type: 'expense',
    })

    expect(categoryResponse.status).toBe(201)

    const categoryId = await getId(categoryResponse)

    const budgetResponse = await createBudget(owner.cookie, categoryId, {
      month: '2026-08',
      amountLimit: 1_000_000,
    })

    expect(budgetResponse.status).toBe(201)

    const budgetId = await getId(budgetResponse)

    const listResponse = await SELF.fetch(
      authedJsonRequest(intruder.cookie, '/v1/budgets?month=2026-08', {
        method: 'GET',
      }),
    )

    expect(listResponse.status).toBe(200)

    const body = (await listResponse.json()) as {
      items: Array<{ id: string }>
    }

    expect(body.items.some((item) => item.id === budgetId)).toBe(false)
  })

  it('does not allow another user to update or delete a budget', async () => {
    const owner = await registerUser()
    const intruder = await registerUser()

    const categoryResponse = await createCategory(owner.cookie, {
      name: `Private-${crypto.randomUUID()}`,
      type: 'expense',
    })

    expect(categoryResponse.status).toBe(201)

    const categoryId = await getId(categoryResponse)

    const budgetResponse = await createBudget(owner.cookie, categoryId, {
      month: '2026-08',
      amountLimit: 1_000_000,
    })

    expect(budgetResponse.status).toBe(201)

    const budgetId = await getId(budgetResponse)

    const patchResponse = await SELF.fetch(
      authedJsonRequest(intruder.cookie, `/v1/budgets/${budgetId}`, {
        method: 'PATCH',
        body: {
          amountLimit: 2_000_000,
        },
      }),
    )

    expect(patchResponse.status).toBe(404)

    const deleteResponse = await SELF.fetch(
      authedJsonRequest(intruder.cookie, `/v1/budgets/${budgetId}`, {
        method: 'DELETE',
      }),
    )

    expect(deleteResponse.status).toBe(404)
  })
})

describe('Budget spending calculation', () => {
  it('calculates spent from actual transactions in the budget month', async () => {
    const { cookie } = await registerUser()

    const categoryResponse = await createCategory(cookie, {
      name: `Spent-${crypto.randomUUID()}`,
      type: 'expense',
    })

    expect(categoryResponse.status).toBe(201)

    const categoryId = await getId(categoryResponse)

    const budgetResponse = await createBudget(cookie, categoryId, {
      month: '2026-08',
      amountLimit: 1_000_000,
    })

    expect(budgetResponse.status).toBe(201)

    const walletResponse = await createWallet(cookie)

    expect(walletResponse.status).toBe(201)

    const walletId = await getId(walletResponse)

    const transactionResponse = await createTransaction(cookie, walletId, categoryId, 250_000)

    expect(transactionResponse.status).toBe(201)

    const listResponse = await SELF.fetch(
      authedJsonRequest(cookie, '/v1/budgets?month=2026-08', {
        method: 'GET',
      }),
    )

    expect(listResponse.status).toBe(200)

    const body = (await listResponse.json()) as {
      items: Array<{
        categoryId: string
        spent: number
      }>
    }

    const budget = body.items.find((item) => item.categoryId === categoryId)

    expect(budget).toBeDefined()
    expect(budget?.spent).toBe(250_000)
  })
})
