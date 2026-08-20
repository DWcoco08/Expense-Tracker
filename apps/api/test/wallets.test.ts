import { SELF } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import { authedJsonRequest, registerUser } from './helpers'

async function createWallet(
  cookie: string,
  overrides: Partial<{ name: string; initialBalance: number; note: string | null }> = {},
) {
  const response = await SELF.fetch(
    authedJsonRequest(cookie, '/v1/wallets', {
      method: 'POST',
      body: {
        name: overrides.name ?? 'Ví chính',
        initialBalance: overrides.initialBalance ?? 100_000,
        note: overrides.note,
      },
    }),
  )
  return response
}

describe('POST /v1/wallets', () => {
  it('creates a wallet whose currentBalance starts equal to initialBalance', async () => {
    const { cookie } = await registerUser()

    const response = await createWallet(cookie, { name: 'Ví tiền mặt', initialBalance: 50_000 })

    expect(response.status).toBe(201)
    const wallet = (await response.json()) as {
      name: string
      initialBalance: number
      currentBalance: number
      totalIncome: number
      totalExpense: number
    }
    expect(wallet.name).toBe('Ví tiền mặt')
    expect(wallet.currentBalance).toBe(50_000)
    expect(wallet.totalIncome).toBe(0)
    expect(wallet.totalExpense).toBe(0)
  })

  it('rejects a duplicate active wallet name for the same user (DUPLICATE_NAME)', async () => {
    const { cookie } = await registerUser()
    await createWallet(cookie, { name: 'Ví trùng tên' })

    const response = await createWallet(cookie, { name: 'Ví trùng tên' })

    expect(response.status).toBe(409)
    const body = (await response.json()) as { error: { code: string } }
    expect(body.error.code).toBe('DUPLICATE_NAME')
  })

  it('rejects a negative initialBalance (VALIDATION)', async () => {
    const { cookie } = await registerUser()

    const response = await createWallet(cookie, { initialBalance: -1 })

    expect(response.status).toBe(400)
    const body = (await response.json()) as { error: { code: string } }
    expect(body.error.code).toBe('VALIDATION')
  })
})

describe('cross-user access (must be 404, never 403)', () => {
  it('hides another user’s wallet on GET /v1/wallets/:id', async () => {
    const owner = await registerUser()
    const intruder = await registerUser()
    const created = await createWallet(owner.cookie)
    const { id } = (await created.json()) as { id: string }

    const response = await SELF.fetch(
      authedJsonRequest(intruder.cookie, `/v1/wallets/${id}`, { method: 'GET' }),
    )

    expect(response.status).toBe(404)
    const body = (await response.json()) as { error: { code: string } }
    expect(body.error.code).toBe('NOT_FOUND')
  })

  it('hides another user’s wallet on PATCH and DELETE', async () => {
    const owner = await registerUser()
    const intruder = await registerUser()
    const created = await createWallet(owner.cookie)
    const { id } = (await created.json()) as { id: string }

    const patch = await SELF.fetch(
      authedJsonRequest(intruder.cookie, `/v1/wallets/${id}`, {
        method: 'PATCH',
        body: { name: 'Chiếm đoạt' },
      }),
    )
    const del = await SELF.fetch(
      authedJsonRequest(intruder.cookie, `/v1/wallets/${id}`, { method: 'DELETE' }),
    )

    expect(patch.status).toBe(404)
    expect(del.status).toBe(404)
  })
})

describe('archive / unarchive', () => {
  it('archives a wallet then blocks unarchive if the name was reused meanwhile', async () => {
    const { cookie } = await registerUser()
    const created = await createWallet(cookie, { name: 'Ví du lịch' })
    const { id } = (await created.json()) as { id: string }

    const archived = await SELF.fetch(
      authedJsonRequest(cookie, `/v1/wallets/${id}/archive`, { method: 'POST' }),
    )
    expect(archived.status).toBe(200)
    const archivedBody = (await archived.json()) as { archivedAt: number | null }
    expect(archivedBody.archivedAt).not.toBeNull()

    await createWallet(cookie, { name: 'Ví du lịch' })

    const unarchived = await SELF.fetch(
      authedJsonRequest(cookie, `/v1/wallets/${id}/unarchive`, { method: 'POST' }),
    )
    expect(unarchived.status).toBe(409)
    const body = (await unarchived.json()) as { error: { code: string } }
    expect(body.error.code).toBe('DUPLICATE_NAME')
  })

  it('excludes archived wallets from the default list', async () => {
    const { cookie } = await registerUser()
    const created = await createWallet(cookie, { name: 'Ví sẽ ẩn' })
    const { id } = (await created.json()) as { id: string }
    await SELF.fetch(authedJsonRequest(cookie, `/v1/wallets/${id}/archive`, { method: 'POST' }))

    const defaultList = await SELF.fetch(
      authedJsonRequest(cookie, '/v1/wallets', { method: 'GET' }),
    )
    const withArchived = await SELF.fetch(
      authedJsonRequest(cookie, '/v1/wallets?includeArchived=true', { method: 'GET' }),
    )

    const defaultItems = ((await defaultList.json()) as { items: { id: string }[] }).items
    const allItems = ((await withArchived.json()) as { items: { id: string }[] }).items
    expect(defaultItems.some((w) => w.id === id)).toBe(false)
    expect(allItems.some((w) => w.id === id)).toBe(true)
  })
})
