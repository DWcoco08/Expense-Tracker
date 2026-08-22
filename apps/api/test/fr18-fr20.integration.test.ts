import { env, SELF } from 'cloudflare:test'
import * as schema from '@expense/db/schema'
import { generateId } from '@expense/shared'
import { eq } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import { todayInTimezone } from '../src/lib/clock'
import { createDb } from '../src/lib/db'
import { computeNextRunOn } from '../src/modules/recurring/service'
import { scheduled } from '../src/scheduled'
import { authedJsonRequest, registerUser } from './helpers'

type JsonObject = Record<string, any>
type TransactionSeed = {
  id: string
  userId: string
  walletId: string
  categoryId: string
  amount: number
  note: string | null
  occurredOn: string
  createdAt: number
  updatedAt: number
}

async function insertTransactionBatch(rows: TransactionSeed[]) {
  await env.DB.batch(
    rows.map((row) =>
      env.DB.prepare(
        'INSERT INTO transactions (id, user_id, wallet_id, category_id, amount, note, occurred_on, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      ).bind(
        row.id,
        row.userId,
        row.walletId,
        row.categoryId,
        row.amount,
        row.note,
        row.occurredOn,
        row.createdAt,
        row.updatedAt,
      ),
    ),
  )
}

async function createWallet(cookie: string, name: string) {
  const response = await SELF.fetch(
    authedJsonRequest(cookie, '/v1/wallets', {
      method: 'POST',
      body: { name, initialBalance: 0 },
    }),
  )
  expect(response.status).toBe(201)
  return (await response.json()) as JsonObject
}

async function getExpenseCategory(cookie: string) {
  const response = await SELF.fetch(authedJsonRequest(cookie, '/v1/categories?type=expense'))
  expect(response.status).toBe(200)
  const body = (await response.json()) as { items: JsonObject[] }
  const category = body.items[0]
  if (!category) throw new Error('test fixture has no expense category')
  return category
}

describe('FR-18 scheduled recurring transactions', () => {
  it('creates the due transaction, notification, and next schedule', async () => {
    const { cookie } = await registerUser()
    const wallet = await createWallet(cookie, `scheduled-${Date.now()}`)
    const category = await getExpenseCategory(cookie)
    const today = todayInTimezone('Asia/Ho_Chi_Minh')

    const budgetResponse = await SELF.fetch(
      authedJsonRequest(cookie, '/v1/budgets', {
        method: 'POST',
        body: { categoryId: category.id, month: today.slice(0, 7), amountLimit: 1 },
      }),
    )
    expect(budgetResponse.status).toBe(201)

    const recurringResponse = await SELF.fetch(
      authedJsonRequest(cookie, '/v1/recurring', {
        method: 'POST',
        body: {
          walletId: wallet.id,
          categoryId: category.id,
          amount: 250000,
          frequency: 'daily',
          startOn: today,
          note: 'scheduled fixture',
        },
      }),
    )
    expect(recurringResponse.status).toBe(201)
    const recurring = (await recurringResponse.json()) as JsonObject

    await scheduled({} as ScheduledController, env, {} as ExecutionContext)

    const transactionsResponse = await SELF.fetch(
      authedJsonRequest(cookie, `/v1/transactions?walletId=${wallet.id}`),
    )
    const transactions = (await transactionsResponse.json()) as { items: JsonObject[] }
    expect(
      transactions.items.some(
        (item) => item.amount === 250000 && item.note === 'scheduled fixture',
      ),
    ).toBe(true)

    const notificationsResponse = await SELF.fetch(authedJsonRequest(cookie, '/v1/notifications'))
    const notifications = (await notificationsResponse.json()) as { items: JsonObject[] }
    expect(notifications.items.some((item) => item.type === 'recurring_materialized')).toBe(true)
    expect(notifications.items.some((item) => item.type === 'budget_exceeded')).toBe(true)

    const recurringListResponse = await SELF.fetch(authedJsonRequest(cookie, '/v1/recurring'))
    const recurringList = (await recurringListResponse.json()) as { items: JsonObject[] }
    expect(recurringList.items.find((item) => item.id === recurring.id)?.nextRunOn).toBe(
      computeNextRunOn(today, 'daily', null),
    )
  })
})

describe('FR-19 notifications and ownership', () => {
  it('notifies when spending crosses a budget and scopes recurring/notifications by account', async () => {
    const owner = await registerUser()
    const other = await registerUser()
    const wallet = await createWallet(owner.cookie, `owner-${Date.now()}`)
    const category = await getExpenseCategory(owner.cookie)
    const today = todayInTimezone('Asia/Ho_Chi_Minh')

    const budgetResponse = await SELF.fetch(
      authedJsonRequest(owner.cookie, '/v1/budgets', {
        method: 'POST',
        body: { categoryId: category.id, month: today.slice(0, 7), amountLimit: 1 },
      }),
    )
    expect(budgetResponse.status).toBe(201)

    const recurringResponse = await SELF.fetch(
      authedJsonRequest(owner.cookie, '/v1/recurring', {
        method: 'POST',
        body: {
          walletId: wallet.id,
          categoryId: category.id,
          amount: 2,
          frequency: 'daily',
          startOn: today,
        },
      }),
    )
    const recurring = (await recurringResponse.json()) as JsonObject

    const transactionResponse = await SELF.fetch(
      authedJsonRequest(owner.cookie, '/v1/transactions', {
        method: 'POST',
        body: { walletId: wallet.id, categoryId: category.id, amount: 2, occurredOn: today },
      }),
    )
    expect(transactionResponse.status).toBe(201)

    const ownerNotificationsResponse = await SELF.fetch(
      authedJsonRequest(owner.cookie, '/v1/notifications'),
    )
    const ownerNotifications = (await ownerNotificationsResponse.json()) as { items: JsonObject[] }
    expect(ownerNotifications.items.some((item) => item.type === 'budget_exceeded')).toBe(true)

    const otherRecurringResponse = await SELF.fetch(
      authedJsonRequest(other.cookie, `/v1/recurring/${recurring.id}`),
    )
    expect(otherRecurringResponse.status).toBe(404)

    const otherRecurringListResponse = await SELF.fetch(
      authedJsonRequest(other.cookie, '/v1/recurring'),
    )
    expect(
      ((await otherRecurringListResponse.json()) as { items: JsonObject[] }).items,
    ).toHaveLength(0)

    const notification = ownerNotifications.items[0]
    if (!notification) throw new Error('expected owner notification')
    const otherNotificationResponse = await SELF.fetch(
      authedJsonRequest(other.cookie, `/v1/notifications/${notification.id}/read`, {
        method: 'POST',
      }),
    )
    expect(otherNotificationResponse.status).toBe(404)

    const otherNotificationsResponse = await SELF.fetch(
      authedJsonRequest(other.cookie, '/v1/notifications'),
    )
    expect(
      ((await otherNotificationsResponse.json()) as { items: JsonObject[] }).items,
    ).toHaveLength(0)
  })
})

describe('FR-20 transaction export', () => {
  it('omits truncation at 10,000 rows and sets the header at 10,001', async () => {
    const { cookie, user } = await registerUser()
    const wallet = await createWallet(cookie, `export-${Date.now()}`)
    const category = await getExpenseCategory(cookie)
    const db = createDb(env)
    const now = Date.now()

    for (let start = 0; start < 10001; start += 25) {
      const rows = Array.from({ length: Math.min(25, 10001 - start) }, (_, index) => ({
        id: generateId(),
        userId: user.id,
        walletId: wallet.id,
        categoryId: category.id,
        amount: 100,
        note: null,
        occurredOn: '2026-08-22',
        createdAt: now + start + index,
        updatedAt: now + start + index,
      }))
      await insertTransactionBatch(rows)
    }

    const elevenThousandResponse = await SELF.fetch(
      authedJsonRequest(cookie, '/v1/transactions/export'),
    )
    expect(elevenThousandResponse.status).toBe(200)
    expect(elevenThousandResponse.headers.get('X-Export-Truncated')).toBe('true')
    expect((await elevenThousandResponse.text()).split('\r\n')).toHaveLength(10001)

    await db.delete(schema.transactions).where(eq(schema.transactions.userId, user.id))
    for (let start = 0; start < 10000; start += 25) {
      const rows = Array.from({ length: Math.min(25, 10000 - start) }, (_, index) => ({
        id: generateId(),
        userId: user.id,
        walletId: wallet.id,
        categoryId: category.id,
        amount: 100,
        note: null,
        occurredOn: '2026-08-22',
        createdAt: now + start + index,
        updatedAt: now + start + index,
      }))
      await insertTransactionBatch(rows)
    }

    const tenThousandResponse = await SELF.fetch(
      authedJsonRequest(cookie, '/v1/transactions/export'),
    )
    expect(tenThousandResponse.headers.get('X-Export-Truncated')).toBeNull()
    expect((await tenThousandResponse.text()).split('\r\n')).toHaveLength(10001)
  })
})
