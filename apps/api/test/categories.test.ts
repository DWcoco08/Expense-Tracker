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

async function getCategoryId(response: Response) {
  const body = (await response.json()) as { id: string }
  return body.id
}

async function createWallet(cookie: string) {
  return SELF.fetch(
    authedJsonRequest(cookie, '/v1/wallets', {
      method: 'POST',
      body: {
        name: `Wallet-${crypto.randomUUID()}`,
        initialBalance: 100_000,
      },
    }),
  )
}

async function createTransaction(cookie: string, walletId: string, categoryId: string) {
  return SELF.fetch(
    authedJsonRequest(cookie, '/v1/transactions', {
      method: 'POST',
      body: {
        amount: 10_000,
        walletId,
        categoryId,
        occurredOn: '2026-08-20',
        note: 'Category test transaction',
      },
    }),
  )
}

describe('Category CRUD', () => {
  it('creates a category', async () => {
    const { cookie } = await registerUser()

    const response = await createCategory(cookie, {
      name: `Ăn uống-${crypto.randomUUID()}`,
      type: 'expense',
      icon: 'utensils',
      color: '#f59e0b',
    })

    expect(response.status).toBe(201)

    const category = (await response.json()) as {
      id: string
      name: string
      type: CategoryType
      icon: string | null
      color: string | null
    }

    expect(category.id).toBeTruthy()
    expect(category.name).toContain('Ăn uống')
    expect(category.type).toBe('expense')
    expect(category.icon).toBe('utensils')
    expect(category.color).toBe('#f59e0b')
  })

  it('lists categories', async () => {
    const { cookie } = await registerUser()

    await createCategory(cookie, {
      name: `List-${crypto.randomUUID()}`,
      type: 'expense',
    })

    const response = await SELF.fetch(
      authedJsonRequest(cookie, '/v1/categories', {
        method: 'GET',
      }),
    )

    expect(response.status).toBe(200)

    const body = (await response.json()) as {
      items: Array<{ id: string; name: string; type: CategoryType }>
      nextCursor: string | null
    }

    expect(Array.isArray(body.items)).toBe(true)
    expect(body.nextCursor).toBeNull()
  })

  it('filters categories by type', async () => {
    const { cookie } = await registerUser()

    const expenseName = `Expense-${crypto.randomUUID()}`
    const incomeName = `Income-${crypto.randomUUID()}`

    await createCategory(cookie, {
      name: expenseName,
      type: 'expense',
    })

    await createCategory(cookie, {
      name: incomeName,
      type: 'income',
    })

    const expenseResponse = await SELF.fetch(
      authedJsonRequest(cookie, '/v1/categories?type=expense', {
        method: 'GET',
      }),
    )

    expect(expenseResponse.status).toBe(200)

    const expenseBody = (await expenseResponse.json()) as {
      items: Array<{ name: string; type: CategoryType }>
    }

    expect(expenseBody.items.every((category) => category.type === 'expense')).toBe(true)
    expect(expenseBody.items.some((category) => category.name === expenseName)).toBe(true)
    expect(expenseBody.items.some((category) => category.name === incomeName)).toBe(false)

    const incomeResponse = await SELF.fetch(
      authedJsonRequest(cookie, '/v1/categories?type=income', {
        method: 'GET',
      }),
    )

    expect(incomeResponse.status).toBe(200)

    const incomeBody = (await incomeResponse.json()) as {
      items: Array<{ name: string; type: CategoryType }>
    }

    expect(incomeBody.items.every((category) => category.type === 'income')).toBe(true)
    expect(incomeBody.items.some((category) => category.name === incomeName)).toBe(true)
    expect(incomeBody.items.some((category) => category.name === expenseName)).toBe(false)
  })

  it('updates a category', async () => {
    const { cookie } = await registerUser()

    const created = await createCategory(cookie, {
      name: `Old-${crypto.randomUUID()}`,
      type: 'expense',
    })

    expect(created.status).toBe(201)

    const id = await getCategoryId(created)
    const newName = `Updated-${crypto.randomUUID()}`

    const response = await SELF.fetch(
      authedJsonRequest(cookie, `/v1/categories/${id}`, {
        method: 'PATCH',
        body: {
          name: newName,
          icon: 'shopping-bag',
          color: '#123456',
        },
      }),
    )

    expect(response.status).toBe(200)

    const category = (await response.json()) as {
      id: string
      name: string
      type: CategoryType
      icon: string | null
      color: string | null
    }

    expect(category.id).toBe(id)
    expect(category.name).toBe(newName)
    expect(category.type).toBe('expense')
    expect(category.icon).toBe('shopping-bag')
    expect(category.color).toBe('#123456')
  })

  it('deletes a category without transactions', async () => {
    const { cookie } = await registerUser()

    const created = await createCategory(cookie, {
      name: `Delete-${crypto.randomUUID()}`,
      type: 'expense',
    })

    expect(created.status).toBe(201)

    const id = await getCategoryId(created)

    const response = await SELF.fetch(
      authedJsonRequest(cookie, `/v1/categories/${id}`, {
        method: 'DELETE',
      }),
    )

    expect(response.status).toBe(204)

    const getResponse = await SELF.fetch(
      authedJsonRequest(cookie, `/v1/categories/${id}`, {
        method: 'GET',
      }),
    )

    expect(getResponse.status).toBe(404)
  })
})

describe('Category business rules', () => {
  it('rejects a duplicate active category name with the same type', async () => {
    const { cookie } = await registerUser()

    const name = `Duplicate-${crypto.randomUUID()}`

    const first = await createCategory(cookie, {
      name,
      type: 'expense',
    })

    expect(first.status).toBe(201)

    const response = await createCategory(cookie, {
      name,
      type: 'expense',
    })

    expect(response.status).toBe(409)

    const body = (await response.json()) as {
      error: { code: string }
    }

    expect(body.error.code).toBe('DUPLICATE_NAME')
  })

  it('allows the same name for different category types', async () => {
    const { cookie } = await registerUser()

    const name = `SameName-${crypto.randomUUID()}`

    const expense = await createCategory(cookie, {
      name,
      type: 'expense',
    })

    const income = await createCategory(cookie, {
      name,
      type: 'income',
    })

    expect(expense.status).toBe(201)
    expect(income.status).toBe(201)
  })
})

describe('Category security', () => {
  it('does not expose another user category in the list', async () => {
    const owner = await registerUser()
    const intruder = await registerUser()

    const created = await createCategory(owner.cookie, {
      name: `Private-${crypto.randomUUID()}`,
      type: 'expense',
    })

    expect(created.status).toBe(201)

    const id = await getCategoryId(created)

    const response = await SELF.fetch(
      authedJsonRequest(intruder.cookie, '/v1/categories', {
        method: 'GET',
      }),
    )

    expect(response.status).toBe(200)

    const body = (await response.json()) as {
      items: Array<{ id: string }>
    }

    expect(body.items.some((category) => category.id === id)).toBe(false)
  })

  it('does not allow another user to update or delete the category', async () => {
    const owner = await registerUser()
    const intruder = await registerUser()

    const created = await createCategory(owner.cookie, {
      name: `Private-${crypto.randomUUID()}`,
      type: 'expense',
    })

    expect(created.status).toBe(201)

    const id = await getCategoryId(created)

    const patch = await SELF.fetch(
      authedJsonRequest(intruder.cookie, `/v1/categories/${id}`, {
        method: 'PATCH',
        body: {
          name: 'Hijacked',
        },
      }),
    )

    expect(patch.status).toBe(404)

    const del = await SELF.fetch(
      authedJsonRequest(intruder.cookie, `/v1/categories/${id}`, {
        method: 'DELETE',
      }),
    )

    expect(del.status).toBe(404)
  })
})

describe('Category transaction constraint', () => {
  it('rejects deleting a category that is used by a transaction', async () => {
    const { cookie } = await registerUser()

    const walletResponse = await createWallet(cookie)
    expect(walletResponse.status).toBe(201)

    const wallet = (await walletResponse.json()) as { id: string }

    const categoryResponse = await createCategory(cookie, {
      name: `Used-${crypto.randomUUID()}`,
      type: 'expense',
    })

    expect(categoryResponse.status).toBe(201)

    const categoryId = await getCategoryId(categoryResponse)

    const transactionResponse = await createTransaction(cookie, wallet.id, categoryId)

    expect(transactionResponse.status).toBe(201)

    const deleteResponse = await SELF.fetch(
      authedJsonRequest(cookie, `/v1/categories/${categoryId}`, {
        method: 'DELETE',
      }),
    )

    expect(deleteResponse.status).toBe(409)

    const body = (await deleteResponse.json()) as {
      error: { code: string }
    }

    expect(body.error.code).toBe('CATEGORY_HAS_TRANSACTIONS')
  })
})
